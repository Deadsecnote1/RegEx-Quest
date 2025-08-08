import { levels } from './levels.js';

// Game state
let score = 0;
let timer = 0;
let timerInterval = null;
let currentDifficulty = "easy";
let currentLevelIndex = 0;

// DOM elements
const elements = {
  score: document.getElementById("scoreDisplay"),
  timer: document.getElementById("timerDisplay"),
  difficulty: document.getElementById("difficulty"),
  word: document.getElementById("word"),
  hint: document.getElementById("hint"),
  input: document.getElementById("regexInput"),
  submit: document.getElementById("submitBtn"),
  feedback: document.getElementById("feedback"),
  next: document.getElementById("nextBtn"),
  reset: document.getElementById("resetBtn"),
  testerInput: document.getElementById("testerInput"),
  testerRegex: document.getElementById("testerRegex"),
  testerBtn: document.getElementById("testerBtn"),
  testerResult: document.getElementById("testerResult")
};

// Load custom challenges from localStorage
function loadCustomChallenges() {
  const raw = localStorage.getItem("customChallenges");
  if (!raw) return;

  try {
    JSON.parse(raw).forEach(c => {
      const match = c.solution.match(/^\/(.*)\/([gimsuy]*)$/);
      if (!match) return;
      
      const challenge = {
        word: c.word,
        hint: c.hint,
        solution: new RegExp(match[1], match[2])
      };

      if (levels[c.difficulty]) {
        levels[c.difficulty].push(challenge);
      }
    });
  } catch (err) {
    console.warn("Failed to load custom challenges:", err);
  }
}

// Load current level
function loadLevel() {
  const level = levels[currentDifficulty][currentLevelIndex];
  elements.word.textContent = level.word;
  elements.hint.textContent = level.hint;
  elements.input.value = "";
  elements.feedback.textContent = "";
  elements.next.disabled = true;
}

// Validate regex input
function validateRegex() {
  const userInput = elements.input.value.trim();
  const regexFormat = /^\/(.+)\/([gimsuy]*)$/;
  const match = userInput.match(regexFormat);

  if (!match) {
    showFeedback("⚠️ Please use the format /pattern/flags.", "warning");
    return;
  }

  try {
    const userRegex = new RegExp(match[1], match[2]);
    const currentLevel = levels[currentDifficulty][currentLevelIndex];
    const targetWord = currentLevel.word;
    const expectedSolution = currentLevel.solution;

    // Check if user's regex matches the target word
    const userMatch = targetWord.match(userRegex);
    if (!userMatch) {
      showFeedback("❌ Your regex doesn't match the target word. Try again.", "danger");
      return;
    }

    // Check if the regex matches the ENTIRE word, not just a part
    if (userMatch[0] !== targetWord) {
      showFeedback("❌ Your regex only matches part of the word. It should match the entire word.", "warning");
      return;
    }

    // Check if user's regex is a valid solution for this challenge
    if (isValidSolution(userRegex, currentLevel)) {
      showFeedback("✅ Correct!", "success");
      elements.next.disabled = false;
      score++;
      elements.score.textContent = score;
    } else {
      showFeedback("❌ Your regex matches the whole word but doesn't solve the challenge correctly. Try again.", "warning");
    }
  } catch (err) {
    showFeedback("⚠️ Invalid regex syntax.", "warning");
  }
}

// Check if the user's regex is a valid solution for the challenge
function isValidSolution(userRegex, level) {
  const targetWord = level.word;
  const hint = level.hint.toLowerCase();
  const expectedSolution = level.solution;
  
  // First check: Does it behave like the expected solution on basic test cases?
  const basicTestCases = generateSmartTestCases(targetWord, hint);
  const matchesExpected = testRegexEquivalence(userRegex, expectedSolution, basicTestCases);
  
  if (matchesExpected) {
    return true; // Perfect match with expected solution
  }
  
  // Second check: Is it a valid alternative solution?
  return isValidAlternativeSolution(userRegex, level, basicTestCases);
}

// Check if user's regex is a valid alternative solution
function isValidAlternativeSolution(userRegex, level, testCases) {
  const targetWord = level.word;
  const hint = level.hint.toLowerCase();
  
  // Must pass the target word
  if (!userRegex.test(targetWord)) {
    return false;
  }
  
  // Challenge-specific alternative validation
  if (hint.includes('only digits')) {
    return validateDigitsChallenge(userRegex, targetWord, testCases);
  }
  
  if (hint.includes('starts with')) {
    return validateStartsWithChallenge(userRegex, targetWord, hint, testCases);
  }
  
  if (hint.includes('ends with')) {
    return validateEndsWithChallenge(userRegex, targetWord, hint, testCases);
  }
  
  if (hint.includes('exactly') && hint.includes('letters')) {
    return validateExactLengthChallenge(userRegex, targetWord, testCases);
  }
  
  if (hint.includes('contains')) {
    return validateContainsChallenge(userRegex, targetWord, hint, testCases);
  }
  
  if (hint.includes('email')) {
    return validateEmailChallenge(userRegex, testCases);
  }
  
  if (hint.includes('date') || hint.includes('YYYY-MM-DD')) {
    return validateDateChallenge(userRegex, testCases);
  }
  
  // For other challenges, fall back to strict equivalence
  return false;
}

// Validate "only digits" challenge - accept both /^\d+$/ and /^\d{n}$/
function validateDigitsChallenge(userRegex, targetWord, testCases) {
  // Must accept the target word (already checked)
  // Must reject non-digit strings
  const nonDigitTests = ['abc', '12a3', 'a123', '12.3', '', ' '];
  for (const test of nonDigitTests) {
    if (userRegex.test(test)) {
      return false; // Should not match non-digits
    }
  }
  
  // Must accept digit-only strings
  const digitTests = ['123', '0', '9999', '42'];
  const acceptsAllDigits = digitTests.every(test => userRegex.test(test));
  const acceptsSpecificLength = userRegex.test(targetWord) && 
                               !userRegex.test('1') && // Doesn't accept single digit
                               !userRegex.test(targetWord + '5'); // Doesn't accept longer
  
  // Accept if it either accepts all digit strings OR accepts specific length
  return acceptsAllDigits || acceptsSpecificLength;
}

// Validate "starts with" challenge
function validateStartsWithChallenge(userRegex, targetWord, hint, testCases) {
  const firstChar = targetWord[0];
  
  // Must accept strings that start with the same character
  const startsWithTests = [firstChar + 'xyz', firstChar + 'test', firstChar];
  if (!startsWithTests.every(test => userRegex.test(test))) {
    return false;
  }
  
  // Must reject strings that don't start with the character
  const otherChars = 'bcdefghijklmnopqrstuvwxyz'.replace(firstChar.toLowerCase(), '');
  const wrongStartTests = [otherChars[0] + targetWord.slice(1), otherChars[1] + 'test'];
  if (wrongStartTests.some(test => userRegex.test(test))) {
    return false;
  }
  
  return true;
}

// Validate "ends with" challenge
function validateEndsWithChallenge(userRegex, targetWord, hint, testCases) {
  const lastChar = targetWord[targetWord.length - 1];
  
  // Must accept strings that end with the same character
  const endsWithTests = ['xyz' + lastChar, 'test' + lastChar];
  if (!endsWithTests.every(test => userRegex.test(test))) {
    return false;
  }
  
  // Must reject strings that don't end with the character
  const otherChars = 'bcdefghijklmnopqrstuvwxyz'.replace(lastChar.toLowerCase(), '');
  const wrongEndTests = [targetWord.slice(0, -1) + otherChars[0], 'test' + otherChars[1]];
  if (wrongEndTests.some(test => userRegex.test(test))) {
    return false;
  }
  
  return true;
}

// Validate "exactly N letters" challenge
function validateExactLengthChallenge(userRegex, targetWord, testCases) {
  const length = targetWord.length;
  
  // Must accept strings of exact length
  const exactLengthTests = ['a'.repeat(length), 'x'.repeat(length)];
  if (!exactLengthTests.every(test => userRegex.test(test))) {
    return false;
  }
  
  // Must reject strings of different lengths
  const wrongLengthTests = ['a'.repeat(length - 1), 'x'.repeat(length + 1)];
  if (wrongLengthTests.some(test => userRegex.test(test))) {
    return false;
  }
  
  return true;
}

// Validate "contains" challenge
function validateContainsChallenge(userRegex, targetWord, hint, testCases) {
  const containsMatch = hint.match(/contains ['"](.+)['"]/);
  if (!containsMatch) return false;
  
  const substring = containsMatch[1];
  
  // Must accept strings containing the substring
  const containsTests = ['x' + substring + 'y', substring + 'test', 'pre' + substring];
  if (!containsTests.every(test => userRegex.test(test))) {
    return false;
  }
  
  // Must reject strings not containing the substring
  const notContainsTests = ['xyz', 'test', substring.slice(0, -1)];
  if (notContainsTests.some(test => userRegex.test(test))) {
    return false;
  }
  
  return true;
}

// Validate email challenge
function validateEmailChallenge(userRegex, testCases) {
  const validEmails = ['test@domain.com', 'user@site.org', 'a@b.co'];
  const invalidEmails = ['notanemail', '@domain.com', 'user@', 'user@domain'];
  
  return validEmails.every(email => userRegex.test(email)) &&
         !invalidEmails.some(email => userRegex.test(email));
}

// Validate date challenge
function validateDateChallenge(userRegex, testCases) {
  const validDates = ['2024-12-31', '1999-01-01', '2025-02-28'];
  const invalidDates = ['24-12-31', '2024/12/31', '2024-1-1'];
  
  return validDates.every(date => userRegex.test(date)) &&
         !invalidDates.some(date => userRegex.test(date));
}

// Test if two regexes are equivalent on given test cases
function testRegexEquivalence(userRegex, expectedRegex, testCases) {
  for (const testCase of testCases) {
    const userResult = userRegex.test(testCase);
    const expectedResult = expectedRegex.test(testCase);
    
    if (userResult !== expectedResult) {
      return false;
    }
  }
  return true;
}

// Generate smart test cases based on challenge type and hint
function generateSmartTestCases(targetWord, hint) {
  let testCases = [targetWord]; // Always include the target word
  
  // Generate test cases based on the hint/challenge type
  if (hint.includes('starts with')) {
    const firstChar = targetWord[0];
    testCases.push(
      firstChar + 'xyz', // Should match: starts with same char
      'x' + targetWord, // Should NOT match: doesn't start with char
      firstChar, // Should match: just the first char + more
      'b' + targetWord.slice(1) // Should NOT match: different first char
    );
  }
  
  if (hint.includes('ends with')) {
    const lastChar = targetWord[targetWord.length - 1];
    testCases.push(
      'xyz' + lastChar, // Should match: ends with same char
      targetWord + 'x', // Should NOT match: doesn't end with char  
      lastChar, // Should match: just the last char
      targetWord.slice(0, -1) + 'x' // Should NOT match: different last char
    );
  }
  
  if (hint.includes('only digits') || hint.includes('digits')) {
    testCases.push('123', '999', '0', '12a3', 'abc', ''); // Numbers vs non-numbers
  }
  
  if (hint.includes('exactly') && hint.includes('letters')) {
    const length = targetWord.length;
    testCases.push(
      'a'.repeat(length), // Same length
      'a'.repeat(length - 1), // Shorter
      'a'.repeat(length + 1), // Longer
      '1'.repeat(length) // Same length, different chars
    );
  }
  
  if (hint.includes('contains')) {
    const containsMatch = hint.match(/contains ['"](.+)['"]/);
    if (containsMatch) {
      const substring = containsMatch[1];
      testCases.push(
        'x' + substring + 'y', // Should match: contains substring
        substring, // Should match: just the substring
        'xyz', // Should NOT match: doesn't contain substring
        substring.slice(0, -1) // Should NOT match: partial substring
      );
    }
  }
  
  if (hint.includes('email')) {
    testCases.push(
      'test@domain.com', 'user@site.org', 'a@b.c', // Valid emails
      'notanemail', '@domain.com', 'user@', 'user@domain' // Invalid emails
    );
  }
  
  if (hint.includes('date') || hint.includes('YYYY-MM-DD')) {
    testCases.push(
      '2024-12-31', '1999-01-01', '2025-02-28', // Valid dates
      '24-12-31', '2024/12/31', '2024-1-1', 'not-a-date' // Invalid formats
    );
  }
  
  if (hint.includes('path')) {
    testCases.push(
      '/usr/bin', '/home/user/docs', '/a', // Valid paths
      'not/a/path', '//', 'C:\\Windows' // Invalid or different formats
    );
  }
  
  if (hint.includes('ip') || hint.includes('IPv4')) {
    testCases.push(
      '10.0.0.1', '255.255.255.255', '0.0.0.0', // Valid IPs
      '999.999.999.999', '1.2.3', 'not.an.ip', '1.2.3.4.5' // Invalid IPs
    );
  }
  
  if (hint.includes('html') || hint.includes('tag')) {
    testCases.push(
      '<p>text</p>', '<div>content</div>', '<span>word</span>', // Valid HTML
      '<tag>text', 'text</tag>', 'no tags here' // Invalid HTML
    );
  }
  
  if (hint.includes('alternating') || hint.includes('pattern')) {
    testCases.push(
      'A1B2C3', 'X9Y8Z7', // Valid alternating patterns
      'ABC123', '123ABC', 'A1B2C' // Invalid patterns
    );
  }
  
  if (hint.includes('letter') && hint.includes('digit') && hint.includes('symbol')) {
    testCases.push(
      'abc123!', 'Test1@', 'Hello9#', // Valid: has all three
      'abc123', 'Test!', '123!@#', 'onlyletters' // Invalid: missing one or more
    );
  }
  
  // Add some general edge cases
  testCases.push('', 'a', 'A', '1', ' ', '!@#', 'verylongstringwithlotsofcharacters');
  
  // Remove duplicates and return
  return [...new Set(testCases)];
}

// Show feedback with styling
function showFeedback(message, type) {
  elements.feedback.textContent = message;
  elements.feedback.className = `feedback-section text-${type}`;
}

// Move to next level
function nextLevel() {
  currentLevelIndex++;
  const levelSet = levels[currentDifficulty];

  if (currentLevelIndex < levelSet.length) {
    loadLevel();
  } else {
    elements.word.textContent = "🎉 You've completed all levels!";
    elements.hint.textContent = "Great job mastering regex!";
    elements.input.disabled = true;
    elements.submit.disabled = true;
    elements.next.disabled = true;
    clearInterval(timerInterval);
  }
}

// Reset game
function resetGame() {
  currentLevelIndex = 0;
  score = 0;
  timer = 0;
  
  elements.input.disabled = false;
  elements.submit.disabled = false;
  elements.score.textContent = score;
  elements.timer.textContent = "00:00";

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer++;
    const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
    const seconds = String(timer % 60).padStart(2, '0');
    elements.timer.textContent = `${minutes}:${seconds}`;
  }, 1000);

  loadLevel();
}

// Test regex in tester panel
function testRegex() {
  const inputText = elements.testerInput.value.trim();
  const userInput = elements.testerRegex.value.trim();
  const regexFormat = /^\/(.+)\/([gimsuy]*)$/;
  const match = userInput.match(regexFormat);

  if (!match) {
    showTesterResult("⚠️ Use format /pattern/flags.", "warning");
    return;
  }

  try {
    const regex = new RegExp(match[1], match[2]);
    const isMatch = regex.test(inputText);
    showTesterResult(
      isMatch ? "✅ Match found!" : "❌ No match.",
      isMatch ? "success" : "danger"
    );
  } catch (err) {
    showTesterResult("⚠️ Invalid regex syntax.", "warning");
  }
}

// Show tester result with styling
function showTesterResult(message, type) {
  elements.testerResult.textContent = message;
  elements.testerResult.className = `tester-result text-${type}`;
}

// Event listeners
elements.difficulty.addEventListener("change", () => {
  currentDifficulty = elements.difficulty.value;
  resetGame();
});

elements.submit.addEventListener("click", validateRegex);
elements.next.addEventListener("click", nextLevel);
elements.reset.addEventListener("click", resetGame);
elements.testerBtn.addEventListener("click", testRegex);

// Enter key support
elements.input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") validateRegex();
});

elements.testerRegex.addEventListener("keypress", (e) => {
  if (e.key === "Enter") testRegex();
});

// Initialize game
loadCustomChallenges();
resetGame();