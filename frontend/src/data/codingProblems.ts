export interface CodingTest {
  input: unknown[];
  expected: unknown;
}

export interface CodingProblem {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  companies: string[];
  relatedQuestionIds: string[];
  description: string;
  constraints: string[];
  functionName: string;
  orderInsensitive?: boolean;
  starter: {
    javascript: string;
    python: string;
  };
  tests: CodingTest[];
}

export const CODING_PROBLEMS: CodingProblem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    companies: ["amazon", "google", "microsoft", "tcs"],
    relatedQuestionIds: ["amazon-9"],
    description:
      "Given an array of integers nums and an integer target, return the 0-based indices of the two numbers such that they add up to target, sorted in ascending order [i, j] with i < j. Exactly one valid pair exists.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i], target <= 10^9",
      "Exactly one valid answer exists.",
    ],
    functionName: "twoSum",
    starter: {
      javascript: `function twoSum(nums, target) {\n  // your code here\n}`,
      python: `def twoSum(nums, target):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
      { input: [[-3, 4, 3, 90], 0], expected: [0, 2] },
      { input: [[0, 4, 8, -2, 11], 6], expected: [2, 3] },
      { input: [[10, 20, 30, 40, 50], 90], expected: [3, 4] },
    ],
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    companies: ["amazon", "google", "goldman-sachs"],
    relatedQuestionIds: ["amazon-3"],
    description:
      "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    constraints: [
      "1 <= height.length <= 2 * 10^4",
      "0 <= height[i] <= 10^5",
    ],
    functionName: "trap",
    starter: {
      javascript: `function trap(height) {\n  // your code here\n}`,
      python: `def trap(height):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], expected: 6 },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { input: [[1, 2, 3, 4]], expected: 0 },
      { input: [[4, 3, 2, 1]], expected: 0 },
      { input: [[5, 0, 5]], expected: 5 },
      { input: [[2, 0, 2, 0, 2]], expected: 4 },
    ],
  },
  {
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "Medium",
    companies: ["google", "amazon", "microsoft", "meta"],
    relatedQuestionIds: ["google-1"],
    description:
      "Given an m x n 2D binary grid of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    constraints: [
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'",
    ],
    functionName: "numIslands",
    starter: {
      javascript: `function numIslands(grid) {\n  // your code here\n}`,
      python: `def numIslands(grid):\n    # your code here\n    pass`,
    },
    tests: [
      {
        input: [
          [
            ["1", "1", "1", "1", "0"],
            ["1", "1", "0", "1", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "0", "0", "0"],
          ],
        ],
        expected: 1,
      },
      {
        input: [
          [
            ["1", "1", "0", "0", "0"],
            ["1", "1", "0", "0", "0"],
            ["0", "0", "1", "0", "0"],
            ["0", "0", "0", "1", "1"],
          ],
        ],
        expected: 3,
      },
      { input: [[["0", "0"], ["0", "0"]]], expected: 0 },
      { input: [[["1"]]], expected: 1 },
      {
        input: [
          [
            ["1", "0", "1"],
            ["0", "1", "0"],
            ["1", "0", "1"],
          ],
        ],
        expected: 5,
      },
    ],
  },
  {
    slug: "meeting-rooms-ii",
    title: "Meeting Rooms II",
    difficulty: "Medium",
    companies: ["google", "meta", "flipkart", "atlassian"],
    relatedQuestionIds: ["google-8"],
    description:
      "Given an array of meeting time intervals where intervals[i] = [start_i, end_i], return the minimum number of conference rooms required so no meetings conflict. Note: a meeting ending at time t does not conflict with a meeting starting at time t.",
    constraints: [
      "1 <= intervals.length <= 10^4",
      "0 <= start_i < end_i <= 10^6",
    ],
    functionName: "minMeetingRooms",
    starter: {
      javascript: `function minMeetingRooms(intervals) {\n  // your code here\n}`,
      python: `def minMeetingRooms(intervals):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[[0, 30], [5, 10], [15, 20]]], expected: 2 },
      { input: [[[7, 10], [2, 4]]], expected: 1 },
      { input: [[[1, 5], [5, 10], [10, 15]]], expected: 1 },
      { input: [[[1, 10], [2, 7], [3, 19], [8, 12], [10, 20], [11, 30]]], expected: 4 },
      { input: [[[0, 5], [0, 5], [0, 5]]], expected: 3 },
    ],
  },
  {
    slug: "valid-palindrome-ii",
    title: "Valid Palindrome II",
    difficulty: "Easy",
    companies: ["meta", "microsoft"],
    relatedQuestionIds: ["meta-6"],
    description:
      "Given a string s, return true if the s can be a palindrome after deleting at most one character from it.",
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists of lowercase English letters.",
    ],
    functionName: "validPalindrome",
    starter: {
      javascript: `function validPalindrome(s) {\n  // your code here\n}`,
      python: `def validPalindrome(s):\n    # your code here\n    pass`,
    },
    tests: [
      { input: ["aba"], expected: true },
      { input: ["abca"], expected: true },
      { input: ["abc"], expected: false },
      { input: ["deeee"], expected: true },
      { input: ["raceacar"], expected: true },
      { input: ["tebbem"], expected: false },
    ],
  },
  {
    slug: "move-zeroes",
    title: "Move Zeroes to End",
    difficulty: "Easy",
    companies: ["tcs", "accenture", "deloitte"],
    relatedQuestionIds: ["tcs-1"],
    description:
      "Given an integer array nums, move all 0's to the end of it while maintaining the relative order of the non-zero elements, and return the resulting array.",
    constraints: [
      "1 <= nums.length <= 10^4",
      "-2^31 <= nums[i] <= 2^31 - 1",
    ],
    functionName: "moveZeroes",
    starter: {
      javascript: `function moveZeroes(nums) {\n  // your code here\n}`,
      python: `def moveZeroes(nums):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0] },
      { input: [[0]], expected: [0] },
      { input: [[4, 2, 4, 0, 0, 3, 0, 5, 1, 0]], expected: [4, 2, 4, 3, 5, 1, 0, 0, 0, 0] },
      { input: [[1, 2, 3]], expected: [1, 2, 3] },
      { input: [[0, 0, 7]], expected: [7, 0, 0] },
    ],
  },
  {
    slug: "sort-colors",
    title: "Sort Colors (0s, 1s, 2s)",
    difficulty: "Medium",
    companies: ["adobe", "microsoft", "flipkart"],
    relatedQuestionIds: ["adobe-1"],
    description:
      "Given an array nums with n objects colored 0, 1, or 2, sort them in-place (and return the sorted array) so that objects of the same color are adjacent in the order 0, 1, and 2.",
    constraints: [
      "1 <= nums.length <= 300",
      "nums[i] is either 0, 1, or 2.",
    ],
    functionName: "sortColors",
    starter: {
      javascript: `function sortColors(nums) {\n  // your code here\n}`,
      python: `def sortColors(nums):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[2, 0, 2, 1, 1, 0]], expected: [0, 0, 1, 1, 2, 2] },
      { input: [[2, 0, 1]], expected: [0, 1, 2] },
      { input: [[0]], expected: [0] },
      { input: [[1, 2, 0, 1, 2, 0, 0]], expected: [0, 0, 0, 1, 1, 2, 2] },
      { input: [[2, 2, 1, 1, 0, 0]], expected: [0, 0, 1, 1, 2, 2] },
    ],
  },
  {
    slug: "kth-largest",
    title: "Kth Largest Element in an Array",
    difficulty: "Medium",
    companies: ["amazon", "meta", "google"],
    relatedQuestionIds: ["amazon-11"],
    description:
      "Given an integer array nums and an integer k, return the kth largest element in the array (not the kth distinct element).",
    constraints: [
      "1 <= k <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    functionName: "findKthLargest",
    starter: {
      javascript: `function findKthLargest(nums, k) {\n  // your code here\n}`,
      python: `def findKthLargest(nums, k):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[3, 2, 1, 5, 6, 4], 2], expected: 5 },
      { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4 },
      { input: [[1], 1], expected: 1 },
      { input: [[-1, -5, -2, -8], 2], expected: -2 },
      { input: [[7, 7, 7, 7], 3], expected: 7 },
    ],
  },
  {
    slug: "longest-palindromic-substring",
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    companies: ["adobe", "amazon", "microsoft"],
    relatedQuestionIds: ["adobe-6"],
    description:
      "Given a string s, return the longest palindromic substring in s.",
    constraints: [
      "1 <= s.length <= 1000",
      "s consists of only digits and English letters.",
    ],
    functionName: "longestPalindrome",
    starter: {
      javascript: `function longestPalindrome(s) {\n  // your code here\n}`,
      python: `def longestPalindrome(s):\n    # your code here\n    pass`,
    },
    tests: [
      { input: ["cbbd"], expected: "bb" },
      { input: ["racecar"], expected: "racecar" },
      { input: ["a"], expected: "a" },
      { input: ["bananas"], expected: "anana" },
      { input: ["xyabcbaz"], expected: "abcba" },
    ],
  },
  {
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "Medium",
    companies: ["infosys", "amazon", "goldman-sachs"],
    relatedQuestionIds: ["infy-8"],
    description:
      "You are given an integer array coins representing coins of different denominations and an integer amount. Return the fewest number of coins that you need to make up that amount, or -1 if that amount cannot be made up.",
    constraints: [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4",
    ],
    functionName: "coinChange",
    starter: {
      javascript: `function coinChange(coins, amount) {\n  // your code here\n}`,
      python: `def coinChange(coins, amount):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[1, 2, 5], 11], expected: 3 },
      { input: [[2], 3], expected: -1 },
      { input: [[1], 0], expected: 0 },
      { input: [[1, 3, 4], 6], expected: 2 },
      { input: [[2, 5, 10, 1], 27], expected: 4 },
    ],
  },
  {
    slug: "counting-bits",
    title: "Counting Bits",
    difficulty: "Easy",
    companies: ["adobe", "infosys", "accenture"],
    relatedQuestionIds: ["adobe-3"],
    description:
      "Given an integer n, return an array ans of length n + 1 such that for each i (0 <= i <= n), ans[i] is the number of 1's in the binary representation of i.",
    constraints: ["0 <= n <= 10^5"],
    functionName: "countBits",
    starter: {
      javascript: `function countBits(n) {\n  // your code here\n}`,
      python: `def countBits(n):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [2], expected: [0, 1, 1] },
      { input: [5], expected: [0, 1, 1, 2, 1, 2] },
      { input: [0], expected: [0] },
      { input: [8], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1] },
      { input: [1], expected: [0, 1] },
    ],
  },
  {
    slug: "subarray-sum-equals-k",
    title: "Subarray Sum Equals K",
    difficulty: "Medium",
    companies: ["tcs", "meta", "google", "goldman-sachs"],
    relatedQuestionIds: ["tcs-4"],
    description:
      "Given an array of integers nums and an integer k, return the total number of contiguous subarrays whose sum equals to k.",
    constraints: [
      "1 <= nums.length <= 2 * 10^4",
      "-1000 <= nums[i] <= 1000",
      "-10^7 <= k <= 10^7",
    ],
    functionName: "subarraySum",
    starter: {
      javascript: `function subarraySum(nums, k) {\n  // your code here\n}`,
      python: `def subarraySum(nums, k):\n    # your code here\n    pass`,
    },
    tests: [
      { input: [[1, 1, 1], 2], expected: 2 },
      { input: [[1, 2, 3], 3], expected: 2 },
      { input: [[1, -1, 0], 0], expected: 3 },
      { input: [[3, 4, 7, 2, -3, 1, 4, 2], 7], expected: 4 },
      { input: [[1], 0], expected: 0 },
    ],
  },
  {
    slug: "rotting-oranges",
    title: "Rotting Oranges",
    difficulty: "Medium",
    companies: ["amazon", "microsoft", "flipkart"],
    relatedQuestionIds: ["amazon-5"],
    description:
      "In an m x n grid, each cell has value 0 (empty), 1 (fresh orange), or 2 (rotten orange). Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh orange remains, or -1 if impossible.",
    constraints: [
      "1 <= m, n <= 10",
      "grid[i][j] is 0, 1, or 2.",
    ],
    functionName: "orangesRotting",
    starter: {
      javascript: `function orangesRotting(grid) {\n  // your code here\n}`,
      python: `def orangesRotting(grid):\n    # your code here\n    pass`,
    },
    tests: [
      {
        input: [
          [
            [2, 1, 1],
            [1, 1, 0],
            [0, 1, 1],
          ],
        ],
        expected: 4,
      },
      {
        input: [
          [
            [2, 1, 1],
            [0, 1, 1],
            [1, 0, 1],
          ],
        ],
        expected: -1,
      },
      { input: [[[0, 2]]], expected: 0 },
      { input: [[[0]]], expected: 0 },
      { input: [[[1]]], expected: -1 },
    ],
  },
  {
    slug: "search-2d-matrix",
    title: "Search a 2D Sorted Matrix",
    difficulty: "Medium",
    companies: ["microsoft", "google", "adobe"],
    relatedQuestionIds: ["msft-6"],
    description:
      "Write an efficient algorithm that searches for a value target in an m x n integer matrix where integers in each row are sorted ascending left-to-right and integers in each column are sorted ascending top-to-bottom.",
    constraints: [
      "1 <= m, n <= 300",
      "-10^9 <= matrix[i][j], target <= 10^9",
    ],
    functionName: "searchMatrix",
    starter: {
      javascript: `function searchMatrix(matrix, target) {\n  // your code here\n}`,
      python: `def searchMatrix(matrix, target):\n    # your code here\n    pass`,
    },
    tests: [
      {
        input: [
          [
            [1, 4, 7, 11, 15],
            [2, 5, 8, 12, 19],
            [3, 6, 9, 16, 22],
            [10, 13, 14, 17, 24],
            [18, 21, 23, 26, 30],
          ],
          5,
        ],
        expected: true,
      },
      {
        input: [
          [
            [1, 4, 7, 11, 15],
            [2, 5, 8, 12, 19],
            [3, 6, 9, 16, 22],
            [10, 13, 14, 17, 24],
            [18, 21, 23, 26, 30],
          ],
          20,
        ],
        expected: false,
      },
      { input: [[[-5]], -5], expected: true },
      { input: [[[1, 3, 5]], 4], expected: false },
      { input: [[[1, 2], [3, 4]], 4], expected: true },
    ],
  },
];

export function getProblem(slug: string): CodingProblem | undefined {
  return CODING_PROBLEMS.find((p) => p.slug === slug);
}

export function getProblemForQuestion(
  questionId: string
): CodingProblem | undefined {
  return CODING_PROBLEMS.find((p) =>
    p.relatedQuestionIds.includes(questionId)
  );
}
