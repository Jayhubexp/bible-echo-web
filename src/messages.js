// Only operator-facing instructions reach the desk. Provider responses stay out of the UI.
export function operatorMessage(message=''){
 if(/permission denied|notallowed|microphone access/i.test(message))return 'Allow microphone access in your browser, then start listening again.';
 if(/passphrase/i.test(message))return 'Enter your team’s workspace passphrase and try again.';
 if(/ownership|owns|controller/i.test(message))return 'Another desk may have control. Open the service planner to review ownership.';
 if(/automation held|missed|late|run state/i.test(message))return 'Automation is on hold. Review the current cue in Live control before resuming.';
 if(/413|32 MiB|oversized/i.test(message))return 'Choose a smaller file. Media uploads can be up to 32 MB.';
 if(/429|too many/i.test(message))return 'The workspace is busy. Wait a moment and try again.';
 if(/503|configure|supabase|VITE_|MODEL_|service.role/i.test(message))return 'This feature is unavailable. Ask your workspace administrator to check the setup.';
 if(/502|504|unreachable|fetch|timed out|offline|network/i.test(message))return 'Connection interrupted. Check your connection and try again.';
 if(/409|changed|revision/i.test(message))return 'This item changed on another desk. Refresh the workspace before editing.';
 if(/unknown timezone/i.test(message))return 'Choose a timezone such as Africa/Accra.';
 if(/invalid draft|unreadable draft/i.test(message))return 'The assistant could not prepare a usable draft. Review the source text and try again.';
 if(/unsupported video|thumbnail|invalid width|invalid height/i.test(message))return 'This media could not be previewed. Try a different image or video.';
 if(/^(Enter a title|Each section needs|Arrangement contains|Provide between|Invalid slide style|Stop this service before editing)/.test(message))return message;
 if(/^(Allow pop-ups|Stop the armed service|No KJV passage|Reached the chapter boundary|Confirm permission|Choose a |Open the projector|Missing or archived song|Missing background|Scripture unavailable|Start time has passed|Choose an unambiguous|Enter a valid|The microphone disconnected|Transcription fell behind)/.test(message))return message;
 return 'This action could not be completed. Review your selection and try again.';
}
