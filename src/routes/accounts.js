const express = require("express");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/authorization");
const accountController = require("../controllers/accountController");

const router = express.Router();

router.get("/", authenticate, accountController.getAccounts);
router.get("/:id", authenticate, accountController.getAccountById);
router.post(
  "/",
  authenticate,
  authorize("create_transaction"),
  accountController.createAccount,
);
router.patch(
  "/:id/status",
  authenticate,
  authorize("manage_accounts"),
  accountController.updateAccountStatus,
);

module.exports = router;
