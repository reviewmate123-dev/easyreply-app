// components/Footer.tsx
import React from 'react';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.section}>
          <h4 style={styles.title}>EasyReply</h4>
          <p style={styles.text}>AI-powered review replies for your business</p>
        </div>
        
        <div style={styles.section}>
          <h4 style={styles.title}>Contact Support</h4>
          <div style={styles.contactItem}>
            <span>📧</span>
            <a href="mailto:support@easyreply.com" style={styles.link}>
              support@easyreply.com
            </a>
          </div>
          <div style={styles.contactItem}>
            <span>📱</span>
            <a href="https://wa.me/919876543210" style={styles.link} target="_blank">
              WhatsApp: +91 98765 43210
            </a>
          </div>
          <div style={styles.contactItem}>
            <span>⏱️</span>
            <span style={styles.text}>Response: 24-48 hours</span>
          </div>
        </div>
        
        <div style={styles.section}>
          <h4 style={styles.title}>Quick Links</h4>
          <a href="/pricing" style={styles.link}>Pricing</a>
          <a href="/privacy" style={styles.link}>Privacy</a>
          <a href="/terms" style={styles.link}>Terms</a>
        </div>
      </div>
      
      <div style={styles.copyright}>
        © 2026 EasyReply. All rights reserved.
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '40px 20px 20px',
    width: '100%',
    marginTop: 'auto',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '30px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: '#fff',
    margin: 0,
  },
  text: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  link: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  copyright: {
    textAlign: 'center' as const,
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid #1e293b',
    color: '#64748b',
    fontSize: '14px',
  },
};