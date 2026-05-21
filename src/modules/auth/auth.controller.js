const jwt = require("jsonwebtoken");
const { authService } = require("../../services/auth.service");
const { env } = require("../../config/env");
const { logger } = require("../../config/logger");
const { jiraService } = require("../../services/jira.service");
const { successResponse } = require("../../utils/api-response");
const { ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS, buildCookieOptions } = require("../../utils/token");

function setAuthCookies(res, tokens) {
  res.cookie("accessToken", tokens.accessToken, buildCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie("refreshToken", tokens.refreshToken, buildCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

function clearAuthCookies(res) {
  res.clearCookie("accessToken", buildCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.clearCookie("refreshToken", buildCookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
}

function redirectWithError(res, message) {
  const url = new URL("/signin", env.frontendUrl);
  url.searchParams.set("error", message);
  return res.redirect(url.toString());
}

function redirectWithFrontendPath(res, path, searchParams = {}) {
  const url = new URL(path, env.frontendUrl);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return res.redirect(url.toString());
}

function getOAuthProviderError(query, fallbackMessage) {
  if (!query?.error && !query?.error_description) {
    return null;
  }

  return {
    message: query.error_description || query.error || fallbackMessage,
    code: query.error || "oauth_error",
    description: query.error_description || ""
  };
}

async function signup(req, res) {
  const result = await authService.signup(req.body);
  setAuthCookies(res, result.tokens);
  res.status(201).json(successResponse({ user: result.user }, "Signup successful"));
}

async function login(req, res) {
  const result = await authService.login(req.body);
  setAuthCookies(res, result.tokens);
  res.json(successResponse({ user: result.user }, "Login successful"));
}

async function checkEmailAvailability(req, res) {
  const result = await authService.checkEmailAvailability(req.query.email);
  res.json(successResponse(result));
}

async function refresh(req, res) {
  const refreshToken = req.cookies.refreshToken;
  const result = await authService.refresh(refreshToken);
  setAuthCookies(res, result.tokens);
  res.json(successResponse({ user: result.user }, "Token refreshed"));
}

async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.body);
  res.json(
    successResponse(
      result,
      "If an account exists for that email, a password reset link has been prepared."
    )
  );
}

async function resetPassword(req, res) {
  const result = await authService.resetPassword(req.body);
  clearAuthCookies(res);
  res.json(successResponse(result, "Password reset successful. Please sign in again."));
}

async function logout(req, res) {
  await authService.logout(req.cookies.refreshToken);
  clearAuthCookies(res);
  res.json(successResponse({ loggedOut: true }, "Logout successful"));
}

async function changePassword(req, res) {
  const result = await authService.changePassword(req.user.id, req.body);
  clearAuthCookies(res);
  res.json(successResponse(result, "Password updated. Please sign in again."));
}

async function deleteAccount(req, res) {
  const result = await authService.deleteAccount(req.user.id, req.body);
  clearAuthCookies(res);
  res.json(successResponse(result, "Account deleted"));
}

async function me(req, res) {
  res.json(
    successResponse({
      user: req.user
    })
  );
}

async function googleConnect(_req, res) {
  const authUrl = authService.getGoogleConnectUrl();
  res.redirect(authUrl);
}

async function googleCallback(req, res) {
  try {
    const providerError = getOAuthProviderError(req.query, "Google sign-in failed");
    if (providerError) {
      logger.warn({ provider: "google", ...providerError }, "Google OAuth provider returned an error");
      return redirectWithError(res, providerError.message);
    }

    const result = await authService.handleGoogleCallback(req.query);
    setAuthCookies(res, result.tokens);
    return res.redirect(new URL("/app", env.frontendUrl).toString());
  } catch (error) {
    logger.error({ err: error, provider: "google" }, "Google OAuth callback failed");
    return redirectWithError(res, error.message || "Google sign-in failed");
  }
}

async function atlassianConnect(_req, res) {
  const authUrl = authService.getAtlassianConnectUrl();
  res.redirect(authUrl);
}

async function atlassianCallback(req, res) {
  try {
    const providerError = getOAuthProviderError(req.query, "Atlassian sign-in failed");
    if (providerError) {
      logger.warn({ provider: "atlassian", ...providerError }, "Atlassian OAuth provider returned an error");
      return redirectWithError(res, providerError.message);
    }

    const decodedState = jwt.verify(req.query.state, env.jwtAccessSecret);

    if (decodedState.flow === "jira-connect") {
      await jiraService.handleCallback(req.query);
      return redirectWithFrontendPath(res, "/integrations", { connected: "jira" });
    }

    const result = await authService.handleAtlassianCallback(req.query);
    setAuthCookies(res, result.tokens);
    return redirectWithFrontendPath(res, "/app");
  } catch (error) {
    logger.error({ err: error, provider: "atlassian" }, "Atlassian OAuth callback failed");
    return redirectWithError(res, error.message || "Atlassian sign-in failed");
  }
}

module.exports = {
  signup,
  login,
  checkEmailAvailability,
  refresh,
  forgotPassword,
  resetPassword,
  logout,
  changePassword,
  deleteAccount,
  me,
  googleConnect,
  googleCallback,
  atlassianConnect,
  atlassianCallback
};
