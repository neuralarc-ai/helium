const AGENT_EMOJIS = [
  '🤖', '🧠', '💡', '🚀', '⚡', '🔮', '🎯', '🛡️', '🔧', '🎨',
  '📊', '📈', '🔍', '🌟', '✨', '🎪', '🎭', '🎨', '🎯', '🎲',
  '🧩', '🔬', '🔭', '🗺️', '🧭', '⚙️', '🛠️', '🔩', '🔗', '📡',
  '🌐', '💻', '🖥️', '📱', '⌨️', '🖱️', '💾', '💿', '📀', '🗄️',
  '📂', '📁', '🗂️', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐',
  '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔐', '🔒',
  '🔓', '🔏', '🔑', '🗝️', '🔨', '⛏️', '⚒️', '🛡️', '🏹', '🎯',
  '🎰', '🎮', '🕹️', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄',
  '🎴', '🎭', '🖼️', '🎨', '🧵', '🧶', '🎸', '🎹', '🎺', '🎻',
  '🥁', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎙️', '🎚️', '🎛️',
  '📻', '📺', '📷', '📹', '📽️', '🎞️', '📞', '☎️', '📟', '📠',
  '💎', '💍', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️',
  '🎫', '🎟️', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
  '🦾', '🦿', '🦴', '👁️', '🧠', '🫀', '🫁', '🦷', '🦴', '👀'
];

const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FECA57', // Yellow
  '#FF9FF3', // Pink
  '#54A0FF', // Blue
  '#48DBFB', // Light Blue
  '#1DD1A1', // Emerald
  '#00D2D3', // Cyan
  '#5F27CD', // Purple
  '#341F97', // Dark Purple
  '#EE5A24', // Orange
  '#F368E0', // Magenta
  '#FF6348', // Coral
  '#7BED9F', // Light Green
  '#70A1FF', // Periwinkle
  '#5352ED', // Indigo
  '#3742FA', // Royal Blue
  '#2ED573', // Green
  '#1E90FF', // Dodger Blue
  '#FF1744', // Red Accent
  '#D500F9', // Purple Accent
  '#00E676', // Green Accent
  '#FF6D00', // Orange Accent
  '#00B8D4', // Cyan Accent
  '#6C5CE7', // Soft Purple
  '#A29BFE', // Lavender
  '#FD79A8', // Rose
  '#FDCB6E', // Mustard
  '#6C5CE7', // Violet
  '#00B894', // Mint
  '#00CEC9', // Turquoise
  '#0984E3', // Blue
  '#6C5CE7', // Purple
  '#A29BFE', // Light Purple
  '#74B9FF', // Light Blue
  '#81ECEC', // Light Cyan
  '#55A3FF', // Sky
  '#FD79A8', // Pink
  '#FDCB6E', // Yellow
  '#FF7675', // Light Red
  '#E17055', // Terra Cotta
  '#FAB1A0', // Peach
  '#74B9FF', // Powder Blue
  '#A29BFE', // Periwinkle
  '#DFE6E9', // Light Gray
  '#B2BEC3', // Gray
  '#636E72', // Dark Gray
];

export function generateRandomEmoji(): string {
  const randomIndex = Math.floor(Math.random() * AGENT_EMOJIS.length);
  return AGENT_EMOJIS[randomIndex];
}

export function generateRandomAvatarColor(): string {
  const randomIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
  return AVATAR_COLORS[randomIndex];
}

export function generateRandomAvatar(): { avatar: string; avatar_color: string } {
  return {
    avatar: generateRandomEmoji(),
    avatar_color: generateRandomAvatarColor(),
  };
}

export function generateAvatarFromSeed(seed: string): { avatar: string; avatar_color: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const emojiIndex = Math.abs(hash) % AGENT_EMOJIS.length;
  const colorIndex = Math.abs(hash >> 8) % AVATAR_COLORS.length;
  return {
    avatar: AGENT_EMOJIS[emojiIndex],
    avatar_color: AVATAR_COLORS[colorIndex],
  };
} 