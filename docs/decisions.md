# Engineering decisions

Short records of choices I made and why. Each one came from a real constraint of building for one specific person.

## 1. Local-first, cloud optional
Check-ins are written to the phone first and mirrored to Firestore afterwards. The app never shows a spinner to save a check-in, works in airplane mode and on a bad connection, and a sign-in on a new phone merges both sides by id. The trade-off is a simple last-write-wins sync, which is fine for one user on one or two devices.

## 2. The AI key never reaches the app
Every AI feature is a Cloud Function behind `httpsCallable`, and each one checks that the caller is signed in. Putting the key in the app would let anyone who unzips the APK spend it.

## 3. Accounts only from the console, and erasing keeps the account
There is no sign-up screen: I create the account, so a leaked APK can't create users that spend the AI budget. Because of that, "erase all my records" deletes data (phone, Firestore and Storage) but keeps the account; otherwise she would lock herself out.

## 4. Two models for two jobs
Support chat and post check-in suggestions use a small, cheap model with short context. The study tutor uses a model that reads images and has a very large context window, because it receives whole PDFs and slide decks. Neither model reads Office files or PDFs directly, so text is extracted on the server (pdf-parse, mammoth and a small `.pptx` reader).

## 5. PDFs rendered on the phone
When she asks for a study PDF, the model returns structured text (`## ` sections and `• ` bullets) and the app renders it with `expo-print` and a styled HTML template. Generating the PDF costs no AI tokens, works offline once the text exists, and keeps the look consistent.

## 6. Study conversations stay on the phone, folders go to the cloud
Chat history with its photos is personal and disposable, so it stays local. Folder material is the opposite: it's what she needs at exam time and must survive a lost phone, so it lives in Firebase Storage with Firestore metadata.

## 7. The server reads folder files itself
For "ask the AI about these items" the app sends only ids. The function downloads the files from Storage, extracts text once and caches it per item. This keeps requests tiny on mobile data, avoids callable payload limits with big PDFs, and makes follow-up questions cheap.

## 8. Tell her what the AI couldn't use
Scanned PDFs have no text layer, audio isn't transcribed for folders, and a huge folder doesn't fit in one request. Instead of answering as if it had read everything, the function returns a note ("couldn't read X", "left out Y") that the app shows above the conversation.

## 9. Her preferences are enforced in code, not only in prompts
"No dashes" is in every system prompt, and every reply also passes through a deterministic filter, because models don't follow style instructions 100% of the time. The same idea applies to copy: no productivity language, no alarming banners.

## 10. Sideloaded APK instead of a store
One user doesn't justify a store listing and review cycles. The APK is built locally with Gradle (the cloud build queue could take an hour) and shared through a private link. Keeping a single signing key matters: an APK signed with another key can't update the installed app.

## 11. Share intent instead of a WhatsApp integration
Material arrives in WhatsApp groups. Rather than integrating with WhatsApp, the app registers as a target in Android's share sheet (`expo-share-intent`), which works for WhatsApp, the gallery, Drive and any other app with zero backend.
