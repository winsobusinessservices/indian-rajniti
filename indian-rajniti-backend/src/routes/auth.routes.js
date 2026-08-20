const express = require("express");
const routes = express.Router();
const {
  login,
  register,
  getCurrentUser,
  listUsers,
  adminAssignRole,
  updateUserRole,
  updateUser,
  deleteUser,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/auth/auth.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { uploadUserDocuments } = require("../middleware/upload.middleware");

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: John Doe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, format: password, example: secret123 }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing or invalid fields
 *       409:
 *         description: User already exists
 */
routes.post("/auth/register", register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in and receive an HttpOnly auth cookie
 *     description: On success, sets the JWT in an HttpOnly "token" cookie. The token is not included in the JSON body.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, format: password, example: secret123 }
 *     responses:
 *       200:
 *         description: Login successful, auth cookie set
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Account is not active
 */
routes.post("/auth/login", login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: The authenticated user's profile
 *       401:
 *         description: Missing or invalid token
 */
routes.get("/auth/me", authenticate, getCurrentUser);

/**
 * @openapi
 * /api/auth/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Caller is not an admin
 */
routes.get("/auth/users", authenticate, authorize("ADMIN","INVESTOR"), listUsers);

/**
 * @openapi
 * /api/auth/admin/users:
 *   post:
 *     summary: Assign an Author, Editor, or Investor role to an existing account (admin only)
 *     description: >
 *       The target account must already exist (self-registered via the public
 *       /auth/register signup) — this does not create accounts or set passwords.
 *       It updates the account's role and, if provided, its role-required KYC
 *       documents. Author needs PAN + Aadhar on file; Editor needs PAN + Aadhar +
 *       a graduation certificate; Investor needs none. Documents only need to be
 *       attached here if not already on file. multipart/form-data — fields
 *       panDocument, aadharDocument, graduationCertificate accept image or PDF.
 *       Emails the user that their role has changed, unless the role is unchanged.
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [email, role]
 *             properties:
 *               email: { type: string }
 *               role: { type: string, enum: [AUTHOR, EDITOR, INVESTOR] }
 *               panDocument: { type: string, format: binary }
 *               aadharDocument: { type: string, format: binary }
 *               graduationCertificate: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Missing/invalid fields or missing required document(s)
 *       403:
 *         description: Caller is not an admin
 *       404:
 *         description: No account exists with that email
 */
routes.post("/auth/admin/users", authenticate, authorize("ADMIN"), uploadUserDocuments, adminAssignRole);

/**
 * @openapi
 * /api/auth/users/{id}/role:
 *   patch:
 *     summary: Update a user's role (admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, AUTHOR, EDITOR, ADMIN, INVESTOR] }
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid role
 *       403:
 *         description: Caller is not an admin
 *       404:
 *         description: User not found
 */
routes.patch("/auth/users/:id/role", authenticate, authorize("ADMIN"), updateUserRole);

/**
 * @openapi
 * /api/auth/users/{id}:
 *   patch:
 *     summary: Update a user's name, email, and/or role (admin only)
 *     description: >
 *       Backs the Team Members table's inline edit — all fields are optional,
 *       only the ones sent are changed. An admin cannot change their own role
 *       through this endpoint (use another admin's account to do that).
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [USER, AUTHOR, EDITOR, ADMIN, INVESTOR] }
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Invalid name/email/role, or attempted self role-change
 *       403:
 *         description: Caller is not an admin
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
routes.patch("/auth/users/:id", authenticate, authorize("ADMIN"), updateUser);

/**
 * @openapi
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Attempted to delete own account
 *       403:
 *         description: Caller is not an admin
 *       404:
 *         description: User not found
 */
routes.delete("/auth/users/:id", authenticate, authorize("ADMIN"), deleteUser);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out the current user
 *     description: Clears the HttpOnly auth cookie set at login.
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Missing or invalid token
 */
routes.post("/auth/logout", authenticate, logout);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     summary: Change the password of the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Missing fields or weak new password
 *       401:
 *         description: Missing/invalid token or incorrect current password
 */
routes.post("/auth/change-password", authenticate, changePassword);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     description: Always returns the same response whether or not the email is registered, to prevent account enumeration. The reset token is emailed to the user in production.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *     responses:
 *       200:
 *         description: Reset instructions sent if the email is registered
 *       400:
 *         description: Missing email
 */
routes.post("/auth/forgot-password", forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset a password using a token from forgot-password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Missing fields or weak new password
 *       401:
 *         description: Invalid or expired reset token
 *       404:
 *         description: User not found
 */
routes.post("/auth/reset-password", resetPassword);

module.exports = routes;
