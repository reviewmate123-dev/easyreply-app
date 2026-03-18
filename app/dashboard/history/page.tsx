// app/dashboard/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

type HistoryItem = {
  id: string;
  review: string;
  reply: string;
  tone: string;
  credits: number;
  createdAt: Date;
  userEmail: string;
  userName: string;
  deviceId: string;
  ip: string;
  isRegenerate: boolean;
};

const toDateSafe = (value: any): Date => {
  if (!value) return new Date(0);
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

export default function UserHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/auth-login');
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/history', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to fetch history');
        }

        const historyData: HistoryItem[] = (payload?.history || []).map((item: any) => ({
          id: item.id,
          review: item.review || '',
          reply: item.reply || 'No reply generated',
          tone: item.tone || 'Professional',
          credits: item.credits || 1,
          createdAt: toDateSafe(item.createdAt),
          userEmail: item.userEmail || '',
          userName: item.userName || '',
          deviceId: item.deviceId || '',
          ip: item.ip || '',
          isRegenerate: Boolean(item.isRegenerate),
        }));

        setHistory(historyData);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.review?.toLowerCase().includes(search.toLowerCase()) ||
      item.reply?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || item.tone === filter;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSearch = () => {
    setSearch(search);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.style.backgroundColor = '#1a1a1a';
      document.body.style.color = '#ffffff';
    } else {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  };

  if (loading) {
    return (
      <div style={darkMode ? { ...styles.loadingContainer, ...styles.loadingContainerDark } : styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading your history...</p>
      </div>
    );
  }

  return (
    <div style={darkMode ? { ...styles.container, ...styles.containerDark } : styles.container}>
      {/* Header Bar */}
      <div style={darkMode ? { ...styles.header, ...styles.headerDark } : styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>RepuLabAi</span>
        </div>
        <div style={styles.headerCenter}>
          <a href="/features" style={darkMode ? { ...styles.navLink, ...styles.navLinkDark } : styles.navLink}>Features</a>
          <a href="/pricing" style={darkMode ? { ...styles.navLink, ...styles.navLinkDark } : styles.navLink}>Pricing</a>
          <a href="/contact" style={darkMode ? { ...styles.navLink, ...styles.navLinkDark } : styles.navLink}>Contact</a>
        </div>
        <div style={styles.headerRight}>
          <button
            style={darkMode ? { ...styles.darkModeToggle, ...styles.darkModeToggleDark } : styles.darkModeToggle}
            onClick={toggleDarkMode}
          >
            ??
          </button>
        </div>
      </div>

      <div style={styles.contentWrapper}>
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>My Generation History</h1>
          <button
            style={styles.backBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(107, 41, 140, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search reviews or replies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.searchInput}
            />
            <button
              style={styles.searchButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(107, 41, 140, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(107, 41, 140, 0.25)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onClick={handleSearch}
            >
              Search
            </button>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6B298C';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 41, 140, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            }}
          >
            <option value="all">All Tones</option>
            <option value="Professional">Professional</option>
            <option value="Friendly">Friendly</option>
            <option value="Apology">Apology</option>
            <option value="Short">Short</option>
            <option value="Long">Long</option>
          </select>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>??</div>
            <h3>No history found</h3>
            <p>Generate your first reply to see it here!</p>
            <button
              style={styles.generateBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(107, 41, 140, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(107, 41, 140, 0.25)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'translateY(2px)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onClick={() => router.push('/dashboard')}
            >
              Generate Now
            </button>
          </div>
        ) : (
          <div style={styles.historyList}>
            {filteredHistory.map((item) => (
              <div key={item.id} style={styles.historyCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.toneBadge}>{item.tone}</span>
                  <span style={styles.date}>{formatDate(item.createdAt)}</span>
                </div>

                <div style={styles.reviewSection}>
                  <div style={styles.label}>Review:</div>
                  <div style={styles.review}>{item.review}</div>
                </div>

                <div style={styles.replySection}>
                  <div style={styles.label}>Reply:</div>
                  <div style={styles.reply}>{item.reply}</div>
                </div>

                <div style={styles.cardFooter}>
                  <span style={styles.credits}>? {item.credits} credit used</span>
                  <button
                    style={styles.copyBtn}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(107, 41, 140, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(107, 41, 140, 0.25)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = 'translateY(2px)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(item.reply);
                      alert('Reply copied to clipboard!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: any = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eef2ff, #f8fafc)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingTop: '80px',
  },
  containerDark: {
    background: 'linear-gradient(135deg,#2d2d2d,#1a1a1a)',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 40px',
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerDark: {
    background: 'rgba(26,26,26,0.9)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#6B298C',
    cursor: 'pointer',
    fontFamily: "'Poppins', 'Inter', sans-serif",
    letterSpacing: '-0.02em',
  },
  headerCenter: {
    flex: 2,
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
  },
  headerRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  navLink: {
    color: '#333',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'color 0.2s ease',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  navLinkDark: {
    color: '#fff',
  },

  darkModeToggle: {
    background: 'transparent',
    border: '2px solid #6B298C',
    borderRadius: '50%',
    width: '38px',
    height: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#6B298C',
    padding: 0,
    transition: 'all 0.2s ease',
  },
  darkModeToggleDark: {
    border: '2px solid #6B298C',
    color: '#6B298C',
  },

  contentWrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
  },

  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },

  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: "'Poppins', 'Inter', sans-serif",
    letterSpacing: '-0.02em',
    margin: 0,
  },

  backBtn: {
    padding: '10px 24px',
    background: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    color: '#6B298C',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },

  filterBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
  },

  searchContainer: {
    flex: 1,
    display: 'flex',
    gap: '10px',
  },

  searchInput: {
    flex: 1,
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    outline: 'none',
  },

  searchButton: {
    padding: '12px 24px',
    background: '#ffffff',
    color: '#353E43',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 4px 8px rgba(107, 41, 140, 0.25)',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },

  filterSelect: {
    width: '200px',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease',
  },

  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },

  historyCard: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 10px 30px rgba(107, 41, 140, 0.1)',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },

  toneBadge: {
    background: '#6B298C',
    color: '#ffffff',
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
  },

  date: {
    color: '#64748b',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  reviewSection: {
    marginBottom: '16px',
  },

  replySection: {
    marginBottom: '20px',
  },

  label: {
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '6px',
    fontWeight: '500',
    fontFamily: "'Inter', sans-serif",
  },

  review: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1e293b',
    background: '#f8fafc',
    padding: '14px',
    borderRadius: '10px',
    fontFamily: "'Inter', sans-serif",
  },

  reply: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1e293b',
    background: '#f3e8ff',
    padding: '14px',
    borderRadius: '10px',
    fontFamily: "'Inter', sans-serif",
  },

  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
  },

  credits: {
    color: '#64748b',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
  },

  copyBtn: {
    padding: '8px 20px',
    background: '#6B298C',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 4px 8px rgba(107, 41, 140, 0.25)',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },

  emptyState: {
    maxWidth: '500px',
    margin: '60px auto',
    textAlign: 'center' as const,
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: '#6B298C',
  },

  generateBtn: {
    padding: '12px 32px',
    background: '#6B298C',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    marginTop: '20px',
    boxShadow: '0 8px 16px rgba(107, 41, 140, 0.25)',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
  },

  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #eef2ff, #f8fafc)',
    color: '#1e293b',
    fontFamily: "'Inter', sans-serif",
  },
  loadingContainerDark: {
    background: 'linear-gradient(135deg,#2d2d2d,#1a1a1a)',
    color: '#ffffff',
  },

  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(107, 41, 140, 0.1)',
    borderRadius: '50%',
    borderTopColor: '#6B298C',
    animation: 'spin 1s ease-in-out infinite',
    marginBottom: '20px',
  },
};
