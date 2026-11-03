# Bible Echo Web
A React and Vite worship presentation desk, deployable independently of Bible Echo API.

## Vercel
Import this GitHub repository into Vercel. Use the Vite preset, project root, Node 24, npm ci, build command npm run build, and output directory dist. Set VITE_API_BASE_URL to the public HTTPS Render origin without /api. Deploy or redeploy after changing it. Configure the API's FRONTEND_ORIGIN with the exact resulting Vercel origin. Preview deployments require their own allowlisted origin. The browser only needs the public API URL.

## Local development
Use Node 22.12+ or 24. Copy .env.example to .env.local, run npm ci and npm run dev. Open http://localhost:5173. npm run build produces dist. A production build requires VITE_API_BASE_URL even when previewed locally.

## Operator workspace
Live Desk brings the sermon listener, transcript, detected references and projection monitor together. The navigation rail opens Scripture, Songs, Backgrounds, Media Library and Service Planner. The service rail follows the selected service or active run. Switch themes in the header; Bible Echo remembers the choice on this browser.

Select Preview to inspect a scripture on the desk. Next and Previous in preview leave the audience on its current verse. Go live opens or reuses the audience window and sends the selection. Clear text keeps the background, and Blackout hides the entire output until restored. A saved song can be added to the open service draft from Songs; review and save the plan in Service Planner.

## Run a service
1. Open the projector from the desk, move its window to the second display, then click Fullscreen inside that window. Allow pop-ups for this origin. The monitor on the desk previews outgoing content.
2. Search for a citation, range, chapter or phrase. Select Project verse. Previous and Next move within the selected passage and update a live passage when its selected verse is already projected.
3. Start listening and grant microphone access. The browser uses Web Audio to capture mono PCM at 16 kHz. It sends ordered WAV clips of up to three seconds, preferring a short pause between phrases. Stop flushes the final partial clip. Listening stops visibly on upstream failure or queue overflow. HTTPS or localhost is required.
4. While a scripture range is live and automatic projection is enabled, say “verse two” to jump within it or “next” on its own to advance. At the end of the range, the last verse stays on screen. Automatic projection is initially enabled for explicit citations. Turn it off for operator review. The desk carries a short transcript tail across chunks to resolve split references. The desk receives validated verses with the transcript. An unavailable reference shows its chapter bounds to the operator and keeps the current audience slide. Review the transcript and use manual lookup if the recognizer mishears the speaker.
5. Under Backgrounds, generate an image, inspect the preview and select Apply to projector. Restore default removes the applied image. Use Save Background to copy the bytes into the shared library. Unsaved previews can expire.

## Files
index.html, package.json and package-lock.json define the build. src/main.jsx implements the operator desk. src/audio.js and public/capture.js handle PCM capture, ordered delivery and WAV encoding. src/api.js uses the v1 HTTP contract. src/projector.jsx and src/style.css implement the projector, dashboard and responsive layout. public/bible-echo.svg is the original Avalonia app's brand asset. vercel.json supports direct projector navigation. .gitignore and .env.example isolate local configuration. The frontend has no source-code dependency on the API repository.

The web workspace projects scripture, prepared songs, licensed videos and animated stills. Projector synchronization requires two windows of the same browser origin and profile. Speech uses the chunked REST API; audio is never stored by the desk.

## Browser acceptance
Run `node tests/acceptance.mjs` with TEST_URL pointing to the running desk and Microsoft Edge installed (or set BROWSER_CHANNEL to chrome). The default URL is https://localhost:5173. The test checks the actual backend, projector popup, KJV range navigation, clear/restore, text resizing and gesture-triggered fullscreen. A single-verse lookup can also step to adjacent verses in the same chapter.

Set TEST_WAV to an absolute WAV path containing "John chapter three verse sixteen" to inject that recording as the browser microphone. Set TEST_IMAGE=1 to exercise generation, preview, apply and restore. Both flags call the real models and require an API key on the server. The fixture tests browser capture and inference; verify the audio input and monitor arrangement on the venue hardware before presenting.


## Media, songs and services

Deploy after the backend migration and API rollout. Set only VITE_API_BASE_URL on Vercel. Enter the shared operator passphrase at the desk. The passphrase stays in this tab’s session storage. Lock workspace closes access on this desk. Production must use HTTPS.

- **Backgrounds and Media Library.** Generate and preview a still, then choose Save Background. The library stores actual bytes in the private bucket. Upload licensed MP4, WebM or GIF media up to 32 MiB. For stills, preview Zoom, Pan or Drift, choose duration and speed, and save the configuration. Apply to projector is explicit. Native GIF repetition follows its embedded timing. Video codecs depend on the audience browser. Animation export is outside this release.
- **Songs.** Create sections, enter their playback order, save alternate arrangements, attribution and preferred background. Import your authorized text or use Muse Spark to format it. AI output is an editable draft. Theme search uses catalog metadata. Original composition requires an explicit request. Title, artist, theme and lyric searches include a starter collection of three public-domain English hymn texts sourced from The Cyber Hymnal via Hymnary.org. Open a result, review its sections and attribution, confirm permission and save it as a workspace song. Other songs require authorized lyrics supplied by the operator. Preview a slide, project it, navigate slides or jump directly to a section. Loaded songs and preloaded media can continue on the open desk and projector during a network outage. Reloading or reopening the app requires connectivity.
- **Service Planner.** Enter the local start time and timezone (default Africa/Accra). Import lines or review a Muse Spark draft. Drag the item summaries or use Move up/down. Select approved songs in playback order, scripture references, backgrounds, layout, action and notes. Timing is sequential and the saved schedule shows the estimated end. Save draft or explicitly Approve and schedule. Open the audience window, choose Arm Service before the scheduled start, then enter fullscreen on that window. Start the microphone separately from Desk if needed.
- **Live control.** The open desk requests deterministic server transitions and publishes only approved cues. Next/Previous/Jump/Skip, Extend, Clear, replacing a background and navigating cue slides hold automatic advancement. Resume explicitly. The first slide of the planned song or passage appears at its cue. Operators advance additional slides within the item. Missed starts and outages hold the output. Recover paused control after reload or transfer; confirm before taking ownership from another desk.

For the extended Playwright check, set TEST_URL and TEST_API_URL to local running servers and TEST_OPERATOR_KEY to the disposable workspace passphrase. Run `node tests/workspace.mjs` after applying the migration. It creates test media, a song and a service, and removes test media and songs on completion. The completed service remains in the disposable schedule. The generated-image fixture isolates save/reload from model availability. The original acceptance script tests actual image generation and voice when their flags are enabled.

### Local verification on 3 November 2026

The Vite production build passed. In Edge, the original acceptance check passed KJV lookup, projector navigation, clear/restore, size and fullscreen. With a synthetic microphone recording, the real Muse Voice request transcribed “John chapter 3 verse 16.” and projected the matching verse. Real Muse Image generation passed preview, explicit apply and restore.

The workspace check verified saving image bytes, reloading the library, editing motion settings, favoriting, creating/editing a song and advancing lyrics offline with preloaded media. A one-second original WebM fixture was uploaded to private storage and observed wrapping its playback time with muted autoplay. The fixture is a solid-color VP8 loop generated for this test.

A static production-build rehearsal armed a two-item service. The first approved song slide appeared at the scheduled start, a second controller was denied, and the operator paused, cleared and resumed the presentation. The next announcement appeared at the timed boundary. Previous Item restored the song in a paused state, and Stop completed the service.
Edge verified reattachment to the same projector after a desk reload. With TEST_SPOKEN_NAV=1, the production-build check uses a transcript fixture and the real scripture endpoint. The audience advanced through Luke 18:1, 2, 3 and 7, then held on verse 7 when given another “next”. Run node tests/spoken-navigation.mjs for command and audio-boundary checks.
