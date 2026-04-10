const fs = require('fs');
let html = fs.readFileSync('netlify_deploy/index.html', 'utf8');
html = html.replace('<script type="module" src="chatbot.bundle.js"></script>', `<script>
  window.addEventListener('error', function(event) {
    fetch('/log_error?msg=' + encodeURIComponent(event.message + ' at ' + event.filename + ':' + event.lineno));
  });
  window.addEventListener('unhandledrejection', function(event) {
    fetch('/log_error?msg=' + encodeURIComponent(event.reason));
  });
</script><script type="module" src="chatbot.bundle.js"></script>`);
fs.writeFileSync('netlify_deploy/index.html', html);
