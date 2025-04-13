-- Function to create multiple education pathways for a user
CREATE OR REPLACE FUNCTION public.create_education_pathways(
  p_user_id UUID,
  p_pathways JSONB[]
)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pathway JSONB;
  v_pathway_id UUID;
BEGIN
  -- Validate user ID
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;
  
  -- Loop through each pathway in the array
  FOREACH v_pathway IN ARRAY p_pathways
  LOOP
    -- Create the pathway
    INSERT INTO public.education_pathways (
      user_id,
      title,
      qualification_type,
      field_of_study,
      subfields,
      target_regions,
      budget_range_usd,
      duration_months,
      alignment_rationale,
      alternatives,
      query_string
    ) VALUES (
      p_user_id,
      v_pathway->>'title',
      v_pathway->>'qualificationType',
      v_pathway->>'fieldOfStudy',
      CASE 
        WHEN v_pathway ? 'subfields' THEN 
          array(select jsonb_array_elements_text(v_pathway->'subfields'))
        ELSE 
          '{}'::text[]
      END,
      CASE 
        WHEN v_pathway ? 'targetRegions' THEN 
          array(select jsonb_array_elements_text(v_pathway->'targetRegions'))
        ELSE 
          '{}'::text[]
      END,
      CASE 
        WHEN v_pathway ? 'budgetRange' THEN 
          v_pathway->'budgetRange'
        ELSE 
          '{"min": 0, "max": 0}'::jsonb
      END,
      CASE 
        WHEN v_pathway ? 'duration' THEN 
          v_pathway->'duration'
        ELSE 
          '{"min": 0, "max": 0}'::jsonb
      END,
      v_pathway->>'alignment',
      CASE 
        WHEN v_pathway ? 'alternatives' THEN 
          array(select jsonb_array_elements_text(v_pathway->'alternatives'))
        ELSE 
          '{}'::text[]
      END,
      v_pathway->>'queryString'
    )
    RETURNING id INTO v_pathway_id;
    
    -- Return the pathway ID
    RETURN NEXT v_pathway_id;
  END LOOP;
  
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in create_education_pathways: %', SQLERRM;
END;
$$;

-- Function to get all pathways for a user
CREATE OR REPLACE FUNCTION public.get_user_pathways(
  p_user_id UUID
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'qualification_type', p.qualification_type,
    'field_of_study', p.field_of_study,
    'subfields', p.subfields,
    'target_regions', p.target_regions,
    'budget_range_usd', p.budget_range_usd,
    'duration_months', p.duration_months,
    'alignment_rationale', p.alignment_rationale,
    'alternatives', p.alternatives,
    'query_string', p.query_string,
    'user_feedback', p.user_feedback,
    'is_explored', p.is_explored,
    'last_explored_at', p.last_explored_at,
    'created_at', p.created_at,
    'recommendations_count', 
      (SELECT COUNT(*) FROM public.recommendations WHERE pathway_id = p.id)
  )
  FROM public.education_pathways p
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to update a pathway's feedback
CREATE OR REPLACE FUNCTION public.update_pathway_feedback(
  p_pathway_id UUID,
  p_feedback JSONB
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pathway_exists boolean;
  v_user_id UUID;
BEGIN
  -- Check if the pathway exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 
    FROM public.education_pathways 
    WHERE id = p_pathway_id 
    AND user_id = auth.uid()
  ) INTO v_pathway_exists;
  
  IF NOT v_pathway_exists THEN
    RETURN false;
  END IF;
  
  -- Update the feedback
  UPDATE public.education_pathways
  SET user_feedback = p_feedback,
      updated_at = now()
  WHERE id = p_pathway_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_pathway_feedback: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to update a pathway's explored status
CREATE OR REPLACE FUNCTION public.update_pathway_explored_status(
  p_pathway_id UUID,
  p_is_explored BOOLEAN
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pathway_exists boolean;
  v_timestamp timestamptz;
BEGIN
  -- Check if the pathway exists and belongs to the user
  SELECT EXISTS(
    SELECT 1 
    FROM public.education_pathways 
    WHERE id = p_pathway_id 
    AND user_id = auth.uid()
  ) INTO v_pathway_exists;
  
  IF NOT v_pathway_exists THEN
    RETURN false;
  END IF;
  
  -- Set the timestamp if we're marking as explored
  IF p_is_explored THEN
    v_timestamp := now();
  ELSE
    v_timestamp := NULL;
  END IF;
  
  -- Update the explored status
  UPDATE public.education_pathways
  SET is_explored = p_is_explored,
      last_explored_at = v_timestamp,
      updated_at = now()
  WHERE id = p_pathway_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in update_pathway_explored_status: %', SQLERRM;
    RETURN false;
END;
$$;

-- Get recommendations for a specific pathway
CREATE OR REPLACE FUNCTION public.get_recommendations_for_pathway(
  p_user_id UUID,
  p_pathway_id UUID
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', r.id,
    'match_score', r.match_score,
    'is_favorite', r.is_favorite,
    'match_rationale', r.match_rationale,
    'feedback_negative', r.feedback_negative,
    'feedback_reason', r.feedback_reason,
    'feedback_submitted_at', r.feedback_submitted_at,
    'pathway_id', r.pathway_id,
    'name', p.name,
    'institution', p.institution,
    'degree_type', p.degree_type,
    'field_of_study', p.field_of_study,
    'description', p.description,
    'cost_per_year', p.cost_per_year,
    'duration', p.duration,
    'location', p.location,
    'start_date', p.start_date,
    'application_deadline', p.application_deadline,
    'requirements', p.requirements,
    'highlights', p.highlights,
    'page_link', p.page_link
  )
  FROM public.recommendations r
  JOIN public.programs p ON r.program_id = p.id
  WHERE r.user_id = p_user_id
    AND r.pathway_id = p_pathway_id;
END;
$$;

-- Modify get_user_recommendations to include pathway_id
CREATE OR REPLACE FUNCTION public.get_user_recommendations(p_user_id uuid)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', r.id,
    'match_score', r.match_score,
    'is_favorite', r.is_favorite,
    'match_rationale', r.match_rationale,
    'feedback_negative', r.feedback_negative,
    'feedback_reason', r.feedback_reason,
    'feedback_submitted_at', r.feedback_submitted_at,
    'pathway_id', r.pathway_id,
    'name', p.name,
    'institution', p.institution,
    'degree_type', p.degree_type,
    'field_of_study', p.field_of_study,
    'description', p.description,
    'cost_per_year', p.cost_per_year,
    'duration', p.duration,
    'location', p.location,
    'start_date', p.start_date,
    'application_deadline', p.application_deadline,
    'requirements', p.requirements,
    'highlights', p.highlights,
    'page_link', p.page_link
  )
  FROM public.recommendations r
  JOIN public.programs p ON r.program_id = p.id
  WHERE r.user_id = p_user_id;
END;
$$; 