import React from "react";

const ShareBar = ({ url, title }) => {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Facebook",
      emoji: "📘",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      bg: "#1877F2",
    },
    {
      label: "WhatsApp",
      emoji: "💬",
      href: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
      bg: "#25D366",
    },
    {
      label: "X / Twitter",
      emoji: "𝕏",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
      bg: "#000000",
    },
    {
      label: "Viber",
      emoji: "📳",
      href: `viber://forward?text=${encodedTitle}%20${encoded}`,
      bg: "#7360F2",
    },
  ];

  const handleShare = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  return (
    <div style={styles.wrapper}>
      <p style={styles.label}>Share this page</p>
      <div style={styles.bar}>
        {links.map(({ label, emoji, href, bg }) => (
          <button
            key={label}
            onClick={() => handleShare(href)}
            style={{ ...styles.btn, backgroundColor: bg }}
            title={`Share on ${label}`}
          >
            <span style={styles.emoji}>{emoji}</span>
            <span style={styles.text}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    textAlign: "center",
    padding: "24px 16px",
    borderTop: "1px solid #e5e7eb",
    marginTop: "40px",
  },
  label: {
    fontSize: "14px",
    color: "#6b7280",
    marginBottom: "12px",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  bar: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    transition: "opacity 0.2s",
  },
  emoji: { fontSize: "16px" },
  text: {},
};

export default ShareBar;
