# Stateful, Application-Aware GradCapAssistant Roadmap

This document outlines how to implement a fully stateful, application-aware chatbot experience on the `/applications/[id]` page using OpenAI's Responses API, conversation state (`previous_response_id`), and function calling. It aligns with the official OpenAI guides on [conversation-state](conversation-state.md) and [function-calling](function-calling.md).  

---

## 1. Goals  
- **Persistent Multi-Turn Context**: Chain all follow-up turns to the original plan generation via `previous_response_id`, minimizing prompt re-construction.  
- **Function-Calling Integration**: Let the model call backend tools (`get_application_state`, `update_application_task`, etc.) seamlessly.  
- **RAG-Ready Indexing**: Persist each user/assistant exchange into the user's vector store for future retrieval.  
- **UX Simplicity**: Users interact exclusively via the `GradCapAssistant` widget—no extra "Refine" buttons.

## 2. OpenAI Conversation State
Refer to [conversation-state guide](conversation-state.md).  
1. **First call**: `responses.create({ input: [...], store: true })` returns `response.id`.  
2. **Chaining**: Subsequent calls set `previous_response_id: <previous_id>`, omitting the full history in `input`.  
3. **Billing**: All tokens across turns (input + output) count against the context window.

## 3. Function Calling
Refer to [function-calling guide](function-calling.md).  
- Define each tool as a JSON schema.  
- `parallel_tool_calls: false` ensures one tool call at a time.  
- Use strict mode to enforce parameter schemas.  
- Handle `response.function_call_arguments.delta` → `response.function_call_arguments.done` → execute, append `function_call_output`, then resume the turn.

---

## 4. Implementation Steps

### A. Database Migration (Already Done)
```sql
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS planner_response_id TEXT;
```
- Index `planner_response_id` to speed lookups if desired.  


### B. `generateApplicationPlan` Changes
```ts
export async function generateApplicationPlan(params):
  // ...
  const response = await openai.responses.create({
    model: MODEL,
    input: [system, user],
    tools: [file_search, web_search],
    store: true,
    previous_response_id: params.previousResponseId,
  });
  const previousResponseId = response.id;
  const plan: ApplicationPlan = JSON.parse(response.output_text!);
  return { plan, previousResponseId };
```
- **Store**: `store: true` persists the conversation.  
- **Chain**: include `previous_response_id` on refinements.

### C. `/api/functions/create_application_plan` & `/save_application_plan`
```ts
// Accept optional previous_response_id
const { recommendation_id, previous_response_id } = await req.json();
const { plan, previousResponseId } =
  await generateApplicationPlan({ ..., previousResponseId: previous_response_id });
// After createApplicationWithPlan → update row:
await supabase
  .from('applications')
  .update({ planner_response_id: previousResponseId })
  .eq('id', newAppId);
return NextResponse.json({ success: true, application_id: newAppId, previous_response_id: previousResponseId });
```
- **Persist** `planner_response_id` to the DB.  
- **Return** it to the client for follow-up turns.

### D. Frontend SDK (`config/functions.ts`)
```ts
export const create_application_plan = async (
  { recommendation_id, previous_response_id }:
  { recommendation_id: string; previous_response_id?: string }
) => {
  return fetch('/api/functions/create_application_plan', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ recommendation_id, previous_response_id }),
  }).then(r => r.json());
};
```
- **Signature** now accepts both fields.

### E. Conversation Store Enhancements
```ts
interface ConversationState {
  previousResponseId: string | null;
  setPreviousResponseId: (id: string|null) => void;
}
```
- **Setter** invoked whenever an assistant finish-turn event occurs.  
- **Reset** on new application loads.

### F. `/applications/[id]/page.tsx` Wiring
1. After fetching `get_application_state`:
   ```ts
   setPreviousResponseId(app.planner_response_id || null);
   ```
2. Pass down to `<GradCapAssistant previousResponseId={previousResponseId} />`.

### G. GradCapAssistant Integration
```tsx
interface Props { previousResponseId?: string; }

useEffect(() => {
  if (props.previousResponseId) {
    addConversationItem({
      role:'system',
      content:`__CHAIN__:${props.previousResponseId}`
    });
  }
}, []);

// In handleSendMessage → before sendUserMessage:
if (store.previousResponseId) {
  await addConversationItem({role:'system', content:`__USE_PREV__:${store.previousResponseId}`});
}
sendUserMessage(userMsg);
```
- A tiny sentinel system message signals to `processMessages` to attach `previous_response_id` (see next).

### H. Core `processMessages` Hook
In `lib/assistant.ts`:
```ts
const { conversationItems, previousResponseId } = useConversationStore.getState();
let payload = [...conversationItems];
if (previousResponseId) {
  // reference doc: conversation-state.md
  payload = payload.filter(m => /* drop old assistant messages */);
}
const request = { model, input: payload, tools, store: true };
if (previousResponseId) request.previous_response_id = previousResponseId;
await openai.responses.create(request);
```
- **Small payload** + `previous_response_id` = efficient multi-turn.
- Streams remain unchanged (function calls, deltas).

### I. Persisting to Vector Store
At each `response.output_item.done` for user or assistant:
```ts
await vectorStoreClient.add({
  userId, appId, role, content: text
});
```
- **RAG**: later vector searches can pull of any past turn.

---

## 5. Alignment with OpenAI Docs
- **`previous_response_id` chaining**: exactly as shown in [conversation-state examples](conversation-state.md).  
- **Function Call flow**: streaming, `function_call_arguments.delta` → `done` → execute → append `function_call_output` → call `processMessages` again, per [function-calling guide](function-calling.md).

### Token & Context Considerations
- We keep most context on the server via `previous_response_id`, avoiding client-side token bloat.  
- Tool definitions (8 total) count towards the context window; with strict mode we meet JSON schema rules.

---

This roadmap ensures the GradCapAssistant on the Application page remains in an ongoing, stateful dialogue with minimal re-prompting, full function-calling power, and a searchable RAG index of all interactions.  

*„Powered by OpenAI Responses API – see conversation-state.md & function-calling.md for best practices.* 



## 6. Editing Session Guide
Follow these sessions sequentially to implement the roadmap with precise file edits:

### Session 1: Plan Generator Enhancements
- File: `lib/ai/applicationManager.ts`
  • Update `generateApplicationPlan` signature to return `{ plan, previousResponseId }` instead of just `plan`.
  • After `const response = await openai.responses.create(...)`, extract `const previousResponseId = response.id;`.
  • Adjust the `return` to `return { plan, previousResponseId };` and update the function’s return type.

### Session 2: Database Migration (Already Done)
- Create a new Supabase migration:
  ```sql
  ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS planner_response_id TEXT;
  ```


### Session 3: API Route Updates
- File: `app/api/functions/create_application_plan/route.ts`
  • Accept optional `previous_response_id` from `request.json()`.
  • Pass `previous_response_id` into `generateApplicationPlan({ ..., previousResponseId: previous_response_id })`.
  • After `createApplicationWithPlan`, persist with:
    ```ts
    await supabase
      .from('applications')
      .update({ planner_response_id: previousResponseId })
      .eq('id', newAppId);
    ```
  • Return `{ success: true, application_id: newAppId, previous_response_id: previousResponseId }`.

- Repeat analogous changes in `save_application_plan` route if using direct save flow.

### Session 4: Frontend SDK Adjustments
- File: `config/functions.ts`
  • Modify `create_application_plan` to accept `previous_response_id?: string`.
  • Include `previous_response_id` in the JSON body when calling the API.

### Session 5: Conversation Store Integration
- File: `stores/useConversationStore.ts`
  • Add state fields `previousResponseId: string | null` and `setPreviousResponseId(id: string|null)`.
  • Initialize `previousResponseId: null` and implement the setter.
  • Clear or reset `previousResponseId` on new loads.

### Session 6: Application Page Wiring
- File: `app/applications/[id]/page.tsx`
  • After fetching via `get_application_state`, call `setPreviousResponseId(app.planner_response_id || null)`.
  • Pass `previousResponseId` prop into `<GradCapAssistant previousResponseId={previousResponseId} />`.

### Session 7: GradCapAssistant Context Chaining
- File: `components/assistant/GradCapAssistant.tsx`
  • Accept prop `previousResponseId?: string`.
  • In a `useEffect` on mount, if provided, call `addConversationItem({ role: 'system', content: 
    `__CHAIN__:${previousResponseId}` });` to signal context chaining.
  • Before sending each user message, insert another system item if `store.previousResponseId` exists:
    ```ts
    if (store.previousResponseId) {
      await addConversationItem({ role: 'system', content: `__USE_PREV__:${store.previousResponseId}` });
    }
    ```

### Session 8: Core ProcessMessages Adjustment
- File: `lib/assistant.ts`
  • In `processMessages`, read `previousResponseId` from store.
  • If set, add `request.previous_response_id = previousResponseId` before calling `openai.responses.create`.
  • Ensure input drops redundant older assistant messages when chaining.

### Session 9: Vector Store Indexing
- Wherever `response.output_item.done` finalizes a user or assistant text, invoke:
  ```ts
  await vectorStoreClient.add({ userId, applicationId, role, content: text });
  ```
- Use `lib/vector-store` client to record each turn.

### Session X: Database Types Correction
- File: `lib/database.types.ts`
  • Remove any misnested `chat_messages` `Insert`/`Update` definitions within other table blocks (e.g., `programs`).
  • Ensure `chat_messages` table definitions are correctly positioned under `Tables`, following the `programs` and other tables in order.

Once all sessions are complete, the Application page’s GradCapAssistant will maintain a tightly chained, function-rich, RAG-enabled dialogue aligned with OpenAI’s conversation-state and function-calling docs.

*Refer to conversation-state.md & function-calling.md for protocol details during each session.*