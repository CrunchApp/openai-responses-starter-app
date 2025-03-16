# Vista Education Adviser - Document Storage Specification

## Overview
The document storage system allows users to upload, manage, and access important educational documents such as transcripts, statements of purpose (SOPs), certificates, and other relevant files. This document outlines the architecture, implementation approach, and security considerations for this feature.

## Architecture

### Components
1. **File Upload Service**: Handles document reception, validation, and storage
2. **Document Metadata Database**: Stores document information and relationships
3. **Cloud Storage System**: Securely stores the actual document files
4. **Access Control Layer**: Manages permissions for document access

### Data Models

#### Document Model
```python
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # e.g., "transcript", "sop", "certificate"
    mime_type = Column(String(100), nullable=False)  # e.g., "application/pdf", "image/jpeg"
    file_size_bytes = Column(Integer, nullable=False)
    storage_path = Column(String(255), nullable=False)  # Path in cloud storage
    storage_provider = Column(String(50), nullable=False, default="aws_s3")  # or "firebase", etc.
    upload_date = Column(DateTime, default=datetime.utcnow)
    last_accessed = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False)
    
    # Optional metadata fields
    description = Column(String(500), nullable=True)
    related_entity_type = Column(String(50), nullable=True)  # e.g., "application", "institution"
    related_entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="documents")
```

## Storage Solution

### Primary Storage: AWS S3
- **Bucket Structure**:
  - Production bucket: `vista-education-documents-prod`
  - Development bucket: `vista-education-documents-dev`
  - Staging bucket: `vista-education-documents-staging`
  
- **File Organization**:
  - Files stored using path pattern: `{user_id}/{document_type}/{unique_id}-{filename}`
  - Example: `550e8400-e29b-41d4-a716-446655440000/transcript/a1b2c3d4-transcript.pdf`

- **Backup Strategy**:
  - Daily backups with 30-day retention
  - Monthly backups with 1-year retention

### Alternative: Firebase Storage (fallback option)
- Similar structure to AWS S3
- Potentially easier integration with Firebase Authentication if adopted

## Upload Process

### 1. Client-Side
- File size validation (max 10MB per file)
- File type validation (allowed extensions: pdf, doc, docx, jpg, png)
- Initial MIME type check
- Progress indicator during upload

### 2. Server-Side Processing
- Secondary validation of file size and type
- Virus/malware scanning (using ClamAV or similar)
- File sanitization (if needed)
- Generation of unique filename
- Metadata extraction (when possible)

### 3. Storage Flow
1. Client uploads file to temporary server storage
2. Server validates and processes the file
3. File is uploaded to cloud storage (S3/Firebase)
4. Metadata is stored in PostgreSQL database
5. Temporary file is removed from server
6. Success/failure response sent to client

## API Endpoints

### Upload Document
```
POST /api/uploads/document
```
Request (multipart/form-data):
```
file: [Binary file data]
document_type: "transcript"
description: "My undergraduate transcript from XYZ University"
related_entity_type: "application" (optional)
related_entity_id: "uuid-string" (optional)
```

Response:
```json
{
  "document_id": "uuid-string",
  "filename": "unique-id-transcript.pdf",
  "original_filename": "transcript.pdf",
  "file_type": "transcript",
  "file_size_bytes": 1048576,
  "upload_date": "2023-04-01T14:30:00Z",
  "mime_type": "application/pdf"
}
```

### Get User Documents
```
GET /api/uploads/documents
```

Parameters:
```
document_type: "transcript" (optional, filter by type)
related_entity_id: "uuid-string" (optional, filter by related entity)
page: 1 (optional, for pagination)
limit: 20 (optional, items per page)
```

Response:
```json
{
  "documents": [
    {
      "document_id": "uuid-string",
      "filename": "unique-id-transcript.pdf",
      "original_filename": "transcript.pdf",
      "file_type": "transcript",
      "file_size_bytes": 1048576,
      "upload_date": "2023-04-01T14:30:00Z",
      "description": "My undergraduate transcript from XYZ University",
      "mime_type": "application/pdf"
    },
    // Additional documents...
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

### Delete Document
```
DELETE /api/uploads/documents/{document_id}
```

Response:
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

## Security Considerations

### Data Protection
- All files encrypted at rest (AES-256)
- TLS/SSL for all data in transit
- Regular security audits

### Access Control
- Only authenticated users can upload documents
- Users can only access their own documents
- Proper IAM roles and policies for cloud storage access
- Time-limited signed URLs for document access
- CSRF protection for upload endpoints

### Compliance
- GDPR compliance:
  - Right to be forgotten (document deletion)
  - Data portability (document export)
- Document retention policies
- Consent collection for document storage

## Frontend Components

### File Upload Component
- Drag-and-drop interface
- Progress indicator
- File type and size validation
- Error handling and retry functionality

### Document Manager Component
- List view of uploaded documents
- Document preview capability (when possible)
- Delete/download options
- Sorting and filtering options

## Implementation Phases

### Phase 1: Basic Upload Functionality
- Implement file uploads to cloud storage
- Create document metadata storage
- Basic UI for upload and listing

### Phase 2: Enhanced Features
- Document preview functionality
- Document categorization and tagging
- Improved error handling and validation

### Phase 3: Advanced Capabilities (Future)
- OCR for text extraction from documents
- AI-based document analysis for education verification
- Enhanced search capabilities

## Monitoring and Logging
- Track upload successes and failures
- Monitor storage usage and costs
- Log access patterns for security analysis
- Performance metrics for upload/download operations

## Testing Strategy
- Unit tests for upload service components
- Integration tests for the complete upload flow
- Security testing (penetration testing)
- Performance testing for large file uploads
- Edge case testing (network interruptions, file corruptions) 