export default function GoogleCalendarSetupPanel({ googleStatus }) {
  if (googleStatus?.configured) return null;

  const redirectUri = googleStatus?.redirect_uri || "http://localhost:8000/integrations/google/calendar/callback";
  const libsOk = googleStatus?.libraries_installed !== false;

  return (
    <div className="meetings-cal__setup">
      <p className="meetings-cal__setup-title">Enable Google Calendar + Meet</p>
      <ol className="meetings-cal__setup-steps">
        <li>
          Open{" "}
          <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer">
            Google Cloud Console
          </a>{" "}
          and enable <strong>Google Calendar API</strong>.
        </li>
        <li>
          Create an OAuth 2.0 <strong>Web application</strong> client ID.
        </li>
        <li>
          Add authorized redirect URI:
          <code className="meetings-cal__setup-code">{redirectUri}</code>
        </li>
        <li>
          Add to <code className="meetings-cal__setup-code">backend/.env</code>:
          <pre className="meetings-cal__setup-pre">{`GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=${redirectUri}`}</pre>
        </li>
        <li>Restart the backend server.</li>
        <li>Click <strong>Connect</strong> below and sign in with Google.</li>
      </ol>
      {!libsOk ? (
        <p className="meetings-cal__setup-warn">
          Install Python packages:{" "}
          <code>pip install google-auth google-auth-oauthlib google-api-python-client</code>
        </p>
      ) : null}
    </div>
  );
}
