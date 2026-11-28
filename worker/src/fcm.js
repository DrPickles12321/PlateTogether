// Sends one web push through Firebase Cloud Messaging (HTTP v1) as a data message, so the app's own service
// worker (public/sw.js) shows it. Returns 'ok', 'gone' (the token no longer works) or 'error'.
export function fcmSender({ projectId, getToken, fetchImpl = fetch }) {
  return {
    async send(token, data) {
      let res
      try {
        res = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: { token, webpush: { headers: { Urgency: 'high', TTL: '1800' }, data } } }),
        })
      } catch {
        return 'error'
      }
      if (res.ok) return 'ok'
      if (res.status === 404) return 'gone'
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}))
        return JSON.stringify(body).includes('UNREGISTERED') || JSON.stringify(body).includes('registration token') ? 'gone' : 'error'
      }
      return 'error'
    },
  }
}
