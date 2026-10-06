# Architecture

## Data layout

Everything belongs to one Firebase user and lives under their uid, so a single security rule (`request.auth.uid == userId`) protects all of it.

```
Firestore
  users/{uid}                              profile
  users/{uid}/meta/cycle                   current cycle + history of period starts
  users/{uid}/logs/{logId}                 check-ins
  users/{uid}/symptoms/{date}              flow and symptoms per day
  users/{uid}/folders/{folderId}           subject folder (name, color, icon, item count)
  users/{uid}/folders/{folderId}/items/{id}   photo, file or note
  users/{uid}/folders/{folderId}/texts/{id}   text extracted by the AI function (cache)

Storage
  users/{uid}/folders/{folderId}/{itemId}.{ext}   the files themselves (max 50 MB each)

Phone (AsyncStorage + app documents folder)
  profile, logs, cycle, symptoms          source of truth offline, mirrored to Firestore
  support chat and study conversations    phone-only, with their photos and PDFs
  cache of opened folder files            so the second open is instant
```

## Check-in to suggestion

```mermaid
sequenceDiagram
  participant U as User
  participant A as App
  participant L as AsyncStorage
  participant F as Firestore
  participant C as aiSuggestion
  U->>A: energy, factors, mood, note
  A->>L: save immediately (works offline)
  A-->>F: mirror the log (if signed in)
  A->>C: check-in + short summary of recent days and cycle phase
  C->>C: verify signed-in user
  C-->>A: one gentle, concrete suggestion
  A->>U: suggestion + "talk about it" opens the chat seeded with it
```

## Subject folders and sharing from WhatsApp

```mermaid
sequenceDiagram
  participant W as WhatsApp
  participant A as App
  participant S as Storage
  participant F as Firestore
  W->>A: Share → app (Android SEND intent, file copied to app cache)
  A->>A: wait for login, open "Save to a folder"
  A->>S: uploadBytesResumable (progress bar)
  A->>F: batch: create item + increment folder count
  Note over A,S: if the item write fails, the uploaded file is deleted
  F-->>A: onSnapshot updates the folder screen live
```

## "Ask the AI" about picked items

```mermaid
sequenceDiagram
  participant A as App
  participant C as aiStudyChat
  participant F as Firestore
  participant S as Storage
  participant O as OpenAI
  A->>C: conversation + { folderId, itemIds }
  C->>F: read folder and picked items (under the caller's uid)
  loop each item, newest first
    alt note
      C->>C: use its text
    else PDF / Word / PPTX / text
      C->>F: texts/{id} cached?
      opt not cached
        C->>S: download file
        C->>C: extract (pdf-parse, mammoth, slide reader)
        C->>F: cache text (empty for scanned PDFs, so it isn't retried)
      end
    else photo
      C->>S: download, attach as image (max 10)
    end
  end
  C->>O: system prompt + material message + conversation
  O-->>C: JSON { reply, document? }
  C-->>A: reply, optional PDF content, note about anything left out
  A->>A: render PDF on the phone if requested
```

The material is rebuilt on every turn from the cache, so the phone never re-uploads files and the AI never "forgets" them as the conversation grows.

## Why a callable for every AI feature

The OpenAI key is a Firebase secret, available only to the functions. The app calls them with `httpsCallable`, which sends the user's ID token; each function rejects unauthenticated calls before doing anything. There is no sign-up screen, so the only accounts are the ones created in the console.
