// Admin panel functionality (separated from main game logic)

// Show admin panel if URL parameter is present
const params = new URLSearchParams(window.location.search);
if (params.get("admin") === "true") {
  document.getElementById("adminPanel").style.display = "block";
}

const STORAGE_KEY = "customChallenges";
let challenges = [];

// Load existing challenges
function loadSavedChallenges() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    challenges = parsed.map(c => ({
      word: c.word,
      hint: c.hint,
      solution: new RegExp(c.solution.slice(1, c.solution.lastIndexOf("/")), c.solution.split("/").pop()),
      difficulty: c.difficulty
    }));
    updatePreview();
  } catch (err) {
    console.warn("Failed to parse saved challenges:", err);
  }
}

// Handle form submission
document.getElementById("challengeForm")?.addEventListener("submit", function(e) {
  e.preventDefault();

  const word = document.getElementById("wordInput").value.trim();
  const hint = document.getElementById("hintInput").value.trim();
  const regexStr = document.getElementById("adminRegexInput").value.trim();
  const difficulty = document.getElementById("difficultyInput").value;

  // Validate regex format
  let solution;
  try {
    const match = regexStr.match(/^\/(.*)\/([gimsuy]*)$/);
    if (!match) throw new Error("Invalid regex format");
    solution = new RegExp(match[1], match[2]);
  } catch (err) {
    alert("❌ Invalid regex format. Use /pattern/flags");
    return;
  }

  // Add new challenge
  const newChallenge = { word, hint, solution, difficulty };
  challenges.push(newChallenge);
  saveChallenges();
  updatePreview();
  this.reset();
});

// Update preview display
function updatePreview() {
  const preview = challenges.map(c => ({
    word: c.word,
    hint: c.hint,
    solution: c.solution.toString(),
    difficulty: c.difficulty
  }));
  
  const previewElement = document.getElementById("challengePreview");
  if (previewElement) {
    previewElement.textContent = JSON.stringify(preview, null, 2);
  }
}

// Save challenges to localStorage
function saveChallenges() {
  const serializable = challenges.map(c => ({
    word: c.word,
    hint: c.hint,
    solution: c.solution.toString(),
    difficulty: c.difficulty
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

// Export challenges as JSON
function exportChallenges() {
  const exportData = challenges.map(c => ({
    word: c.word,
    hint: c.hint,
    solution: c.solution.toString(),
    difficulty: c.difficulty
  }));
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "custom_challenges.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Clear all challenges
function clearChallenges() {
  if (confirm("Are you sure you want to delete all saved challenges?")) {
    localStorage.removeItem(STORAGE_KEY);
    challenges = [];
    updatePreview();
  }
}

// Initialize admin panel
loadSavedChallenges();