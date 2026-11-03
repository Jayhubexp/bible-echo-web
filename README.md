# Bible Echo Web
A React and Vite worship presentation desk, deployable independently of Bible Echo API.

## Vercel
Import this GitHub repository into Vercel. Use the Vite preset, project root, Node 24, npm ci, build command npm run build, and output directory dist. Set VITE_API_BASE_URL to the public HTTPS Render origin without /api. Deploy or redeploy after changing it. Configure the API's FRONTEND_ORIGIN with the exact resulting Vercel origin. Preview deployments require their own allowlisted origin. The browser only needs the public API URL.

## Local development
Use Node 22.12+ or 24. Copy .env.example to .env.local, run npm ci and npm run dev. Open http://localhost:5173. npm run build produces dist. A production build requires VITE_API_BASE_URL even when previewed locally.

## Run a service
1. Open the projector from the desk, move its window to the second display, then click Fullscreen inside that window. Allow pop-ups for this origin. The monitor on the desk previews outgoing content.
2. Search for a citation, range, chapter or phrase. Select Project verse. Previous and Next move within the selected passage and update a live passage when its selected verse is already projected.
3. Start listening and grant microphone access. The browser uses Web Audio to capture mono PCM at 16 kHz. It sends ordered five-second WAV clips to the API and flushes the final partial clip on Stop. Listening stops visibly on upstream failure or queue overflow. HTTPS or localhost is required.
4. Automatic projection is initially enabled for explicit citations. Turn it off for operator review. The desk carries a short transcript tail across chunks to resolve split references. Review the transcript and use manual lookup if the recognizer mishears the speaker.
5. Under Backgrounds, generate an image, inspect the preview and select Apply to projector. Restore default removes the applied image. Generated media stays in memory and temporary URLs may expire.

## Files
index.html, package.json and package-lock.json define the build. src/main.jsx implements the operator desk. src/audio.js and public/capture.js handle PCM capture, ordered delivery and WAV encoding. src/api.js uses the v1 HTTP contract. src/projector.jsx and src/style.css implement the projector, dashboard and responsive layout. public/bible-echo.svg is the original Avalonia app's brand asset. vercel.json supports direct projector navigation. .gitignore and .env.example isolate local configuration. The frontend has no source-code dependency on the API repository.

The MVP projects scripture and generated still backgrounds. The desktop song and picture catalog, service plans and video are outside this web release. Projector synchronization requires two windows of the same browser origin and profile. Speech uses the chunked REST API; audio is never stored by the desk.

## Browser acceptance
Run `node tests/acceptance.mjs` with TEST_URL pointing to the running desk and Microsoft Edge installed (or set BROWSER_CHANNEL to chrome). The default URL is https://localhost:5173. The test checks the actual backend, projector popup, KJV range navigation, clear/restore, text resizing and gesture-triggered fullscreen. A single-verse lookup can also step to adjacent verses in the same chapter.

Set TEST_WAV to an absolute WAV path containing "John chapter three verse sixteen" to inject that recording as the browser microphone. Set TEST_IMAGE=1 to exercise generation, preview, apply and restore. Both flags call the real models and require an API key on the server. The fixture tests browser capture and inference; verify the audio input and monitor arrangement on the venue hardware before presenting.
