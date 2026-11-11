# Security Specification for Melbourne Disciple Church

## Data Invariants
1. A bulletin must have a title, date, and fileUrl.
2. A sermon must have a title, date, speaker, and videoUrl.
3. Only authenticated administrators can create, update, or delete bulletins and sermons.
4. Anyone (even unauthenticated) can read bulletins and sermons.
5. Administrative status is determined by the `admins` collection.

## The Dirty Dozen (Attacker Payloads)

1. **Anonymous Write**: Attempting to create a bulletin without being signed in.
2. **User Write**: Attempting to create a bulletin as a regular user (not an admin).
3. **Identity Spoofing**: Attempting to create a sermon where the creator ID is someone else (though we don't strictly use creatorId, we use role check).
4. **State Poisoning**: Injecting massive strings (1MB) into the `title` field.
5. **ID Poisoning**: Using a 2KB string as a document ID to bloat the database.
6. **Shadow Field Injection**: Adding `isVerified: true` to a bulletin via client-side update.
7. **Bypassing Validation**: Sending a sermon without a `videoUrl`.
8. **Negative timestamps**: Sending a `createdAt` with a value in the past or far future.
9. **Admin Self-Promotion**: A user trying to create a document in the `admins` collection for themselves.
10. **Resource Exhaustion**: Bulk updates to multiple sermons at once without permission.
11. **Query Scraping**: Attempting to list the `admins` collection to find emails.
12. **Malicious Link**: Injecting a `javascript:` URL into `videoUrl`.

## The Test Runner (Mock Tests)
- `bulletins`: allow read if true; allow write if isAdmin()
- `sermons`: allow read if true; allow write if isAdmin()
- `admins`: allow read if isAdmin(); allow create, update, delete if isAdmin() with valid admin schema
