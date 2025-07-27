import React, { useEffect, useState } from 'react';

function App() {
  const [topArticles, setTopArticles] = useState([]);
  const [otherArticles, setOtherArticles] = useState([]);

  // Refresh every hour. For more frequent "breaking news", change to 60_000 (1 minute).
  const POLL_INTERVAL = 3_600_000;
  const OTHER_NEWS_LIMIT = 40;

  useEffect(() => {
    const fetchData = () => {
      // 1. Fetch Top News (filtered by backend)
      fetch('http://localhost:5000/top-articles')
        .then(r => r.json())
        .then(data => {
          const articles = data || [];
          // Deduplicate by title as a fallback
          const unique = articles.filter((item, i, self) =>
            i === self.findIndex(t => t.title === item.title)
          );
          setTopArticles(unique.slice(0, 5));
        })
        .catch(err => console.error("Error fetching top articles:", err));

      // 2. Fetch Other News
      fetch(`http://localhost:5000/other-news?page=1&limit=${OTHER_NEWS_LIMIT}`)
        .then(r => r.json())
        .then(data => {
          const articles = data || [];
          // Combine new and old articles, then deduplicate by title
          setOtherArticles(prev => {
            const combined = [...articles, ...prev];
            const unique = combined.filter((item, i, self) =>
              i === self.findIndex(t => t.title === item.title)
            );
            // Sort by date and keep only the latest 40
            return unique
              .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
              .slice(0, OTHER_NEWS_LIMIT);
          });
        })
        .catch(err => console.error("Error fetching other news:", err));
    };

    fetchData(); // Initial fetch
    const intervalId = setInterval(fetchData, POLL_INTERVAL); // Set up polling

    return () => clearInterval(intervalId); // Cleanup
  }, []); // Empty dependency array ensures this runs only on mount

  const fmt = dt => dt ? new Date(dt).toLocaleString() : 'No date available';

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h3>📈 Top News (War ‧ Religion ‧ Economy ‧ Tech ‧ Politics ‧ World)</h3>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10 }}>
        {topArticles.length === 0 && <em>No top news...</em>}
        {topArticles.map(a => (
          <div key={a.id || a.title} style={{
            minWidth: 200, padding: 10, border: '1px solid #ccc', borderRadius: 6
          }}>
            <div style={{ fontWeight: 'bold' }}>{a.title}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{fmt(a.published_at)}</div>
            <a href={a.url} target="_blank" rel="noreferrer">🔗 Read</a>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 40 }}>🌐 Other News (Latest {OTHER_NEWS_LIMIT})</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 20
      }}>
        {otherArticles.length === 0 && <em>No other news...</em>}
        {otherArticles.map(a => (
          <div key={a.id || a.title} style={{
            padding: 15, border: '1px solid #ddd', borderRadius: 6, background: '#fff'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
              🕒 {fmt(a.published_at)}
            </div>
            <a href={a.url} target="_blank" rel="noreferrer">📰 Open</a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
