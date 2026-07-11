import { createServer, type Server } from 'node:http'

const page = (title: string, body: string) => `<!doctype html>
<html><head><title>${title}</title><meta name="description" content="${title} page"></head>
<body>
<nav><a href="/">Home</a><a href="/services">Services</a><a href="/contact">Contact</a><a href="/blog/post-1">Post</a><a href="/secret">Secret</a></nav>
<main>${body}</main>
<footer>© Example Studio</footer>
</body></html>`

export const FIXTURE_PAGES: Record<string, string> = {
  '/': page('Example Studio', '<h1>Example Studio</h1><p>We design lighthouses for coastal towns.</p>'),
  '/services': page(
    'Services',
    '<h1>Our services</h1><h2>Lighthouse design</h2><p>Complete lighthouse architecture from survey to lamp.</p><h2>Maintenance</h2><p>Annual fresnel lens polishing.</p>',
  ),
  '/contact': page('Contact', '<h1>Contact us</h1><p>Email hello@example-studio.test or call +1 555 010 9999.</p>'),
  '/blog/post-1': page('Why lighthouses matter', '<h1>Why lighthouses matter</h1><p>A meditation on beacons and fog.</p>'),
  '/secret': page('Secret', '<h1>Internal</h1><p>Not for robots.</p>'),
}

const ROBOTS = 'User-agent: *\nDisallow: /secret\n'

/** Serve the fixture site on an ephemeral port. Returns the server and its base URL. */
export function startFixtureSite(): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    if (path === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end(ROBOTS)
    } else if (path in FIXTURE_PAGES) {
      res.writeHead(200, { 'content-type': 'text/html' }).end(FIXTURE_PAGES[path])
    } else {
      res.writeHead(404, { 'content-type': 'text/html' }).end('<html><body>not found</body></html>')
    }
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` })
    })
  })
}
