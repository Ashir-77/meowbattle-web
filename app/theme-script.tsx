export default function ThemeScript() {
  const code = `
    (function() {
      try {
        var saved = document.cookie
          .split('; ')
          .find(function(row) { return row.startsWith('mb_theme='); })
          ?.split('=')[1] || 'system';

        var theme = saved;

        if (saved === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
      } catch (e) {}
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}