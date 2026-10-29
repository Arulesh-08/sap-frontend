# Comprehensive Frontend Code Explanation Guide

This guide is designed for absolute beginners to understand how the React frontend of the SAP portal interacts with the backend. It explains core concepts first, followed by a line-by-line breakdown of the API files:
1. **`src/api/config.js`** (Configuration of the server URL)
2. **`src/api/auth.js`** (Login, registration, and password update requests)

---

## Part 1: Quick Glossary of Frontend Concepts

Before looking at the code, here are basic terms used in React and modern JavaScript frontend applications:

*   **`import { something } from "./file"`**: Used in React/ES6 to bring in code, components, or functions from another file.
*   **`export`**: Used to share a function or variable so other files can import and use it.
*   **`export default`**: Exports one primary entity from a file.
*   **`fetch(url, options)`**: A built-in browser function used to send HTTP requests to a server and get responses back.
*   **Headers (`headers: { ... }`)**: Extra information sent along with a web request (like telling the server we are sending JSON data, or passing a login token for security).
*   **JSON.stringify(data)**: Converts a JavaScript object into a JSON text string so it can be sent over the internet to the backend.
*   **`await res.json()`**: Converts the raw response text received from the backend back into a readable JavaScript object.
*   **`throw new Error(...)`**: Stops the execution of the code and signals that something went wrong, sending the error message to the page UI to show to the user.
*   **`Bearer Token`**: A special authorization code (like a digital key) that proves the user is logged in. It is included in the `Authorization` header.

---

## Part 2: Line-by-Line Breakdown of `src/api/config.js`

This file is the **single source of truth** for where the backend server lives. It determines whether we are running the site locally (for development) or online (for production).

```javascript
4: const BASE_URL =
5:   import.meta.env.VITE_API_URL || "http://localhost:5000/api";
```
*   **`import.meta.env.VITE_API_URL`**: This is how Vite (our React build tool) reads environment variables on the frontend. In a production environment (like Vercel), this variable points to the live backend server.
*   **`|| "http://localhost:5000/api"`**: The OR operator (`||`) serves as a fallback. If the backend server URL is not defined (like when developing on your own computer), it automatically uses the local address `http://localhost:5000/api`.

```javascript
7: export default BASE_URL;
```
*   **`export default`**: Exports the variable `BASE_URL` so that any other API helper file can import it.

---

## Part 3: Line-by-Line Breakdown of `src/api/auth.js`

This file contains functions that trigger API calls to the backend's authentication system (Register, Login, Change Password, etc.).

### Function 1: Register User
```javascript
5: export async function registerUser(data) {
```
*   **`export async function registerUser(data)`**: Declares and exports a helper function that handles registering students. The parameter `data` is an object containing `{ name, email, password, rollNumber, department }`.

```javascript
6:   const res = await fetch(`${BASE_URL}/auth/register`, {
7:     method: "POST",
8:     headers: { "Content-Type": "application/json" },
9:     body: JSON.stringify(data),
10:   });
```
*   **`${BASE_URL}/auth/register`**: Concatenates our server address with the registration endpoint (e.g. `http://localhost:5000/api/auth/register`).
*   **`method: "POST"`**: Specifies we are posting/sending new user data to the backend.
*   **`headers: { "Content-Type": "application/json" }`**: Informs the backend that the request body is formatted in JSON.
*   **`body: JSON.stringify(data)`**: Serializes the user's input data into a JSON string to transfer over the network.
*   **`await`**: Pauses execution until the backend server responds.

```javascript
11:   const result = await res.json();
```
*   **`res.json()`**: Reads the response body returned by the backend and parses it as a JavaScript object.

```javascript
12:   if (!res.ok) throw new Error(result.message || "Registration failed");
13:   return result;
14: }
```
*   **`!res.ok`**: Checks if the response code was an error (e.g. 400 or 500).
*   **`throw new Error(...)`**: Halts execution and returns the failure message (like "Email already registered").
*   **`return result`**: If successful, returns the user details.

---

### Function 2: Change Password (Logged-in Users)
```javascript
16: export async function changePassword(data, token) {
```
*   **`data`**: Object containing `{ currentPassword, newPassword }`.
*   **`token`**: The user's active session token (proof that they are logged in).

```javascript
17:   const res = await fetch(`${BASE_URL}/auth/change-password`, {
18:     method: "POST",
19:     headers: {
20:       "Content-Type": "application/json",
21:       Authorization: `Bearer ${token}`,
22:     },
23:     body: JSON.stringify(data),
24:   });
```
*   **`Authorization: \`Bearer \${token}\``**: This header is critical. It sends the secure token to the backend, enabling the backend to identify which logged-in user is attempting to change their password.

```javascript
25:   const result = await res.json();
26:   if (!res.ok) throw new Error(result.message || "Password change failed");
27:   return result;
28: }
```
*   Parses the result and throws an error if the server rejects the password update (e.g. if the current password is wrong or the new password is too weak).

---

### Function 3: Login User
```javascript
52: export async function loginUser(data) {
```
*   **`data`**: Object containing `{ email, password }`.

```javascript
53:   const res = await fetch(`${BASE_URL}/auth/login`, {
54:     method: "POST",
55:     headers: { "Content-Type": "application/json" },
56:     body: JSON.stringify(data),
57:   });
```
*   Sends a POST request containing the email and password to `/auth/login`.

```javascript
58:   const result = await res.json();
59:   if (!res.ok) throw new Error(result.message || "Login failed");
60:   return result;
61: }
```
*   If login succeeds, the `result` will contain a token and user details (id, role, department) which React stores in the browser's storage to keep the session active.
