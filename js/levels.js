export const levels = {
  easy: [
    { word: "apple", hint: "Starts with 'a'", solution: /^a.*/ },
    { word: "1234", hint: "Only digits", solution: /^\d+$/ },
    { word: "banana", hint: "Ends with 'a'", solution: /.*a$/ },
    { word: "cat", hint: "Exactly 3 letters", solution: /^.{3}$/ },
    { word: "hello", hint: "Contains 'll'", solution: /.*ll.*/ }
  ],
  medium: [
    { word: "file.txt", hint: "Ends with '.txt'", solution: /.*\.txt$/ },
    { word: "user_123", hint: "Alphanumeric with underscore", solution: /^\w+$/ },
    { word: "2025-08-07", hint: "Date format YYYY-MM-DD", solution: /^\d{4}-\d{2}-\d{2}$/ },
    { word: "email@example.com", hint: "Basic email format", solution: /^.+@.+\..+$/ },
    { word: "A1B2C3", hint: "Alternating letter-digit pattern", solution: /^([A-Z]\d){3}$/ }
  ],
  hard: [
    { word: "/home/user/docs", hint: "Unix-style path", solution: /^(\/\w+)+$/ },
    { word: "192.168.0.1", hint: "IPv4 address", solution: /^\d{1,3}(\.\d{1,3}){3}$/ },
    { word: "<div>Hello</div>", hint: "HTML tag with content", solution: /^<\w+>.*<\/\w+>$/ },
    { word: "abc123XYZ", hint: "Mixed case with digits", solution: /^[a-z]+\d+[A-Z]+$/ },
    { word: "password123!", hint: "At least one letter, digit, and symbol", solution: /^(?=.*[a-zA-Z])(?=.*\d)(?=.*\W).+$/ }
  ]
};