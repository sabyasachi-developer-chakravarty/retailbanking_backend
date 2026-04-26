const Account = require("../models/Account");
const Customer = require("../models/Customer");
const { logAudit } = require("../middleware/audit");
const {
  generateAccountNumber,
  formatCurrencyDisplay,
} = require("../utils/helpers");

const getAccounts = async (req, res) => {
  try {
    const query = {};

    // RM can only see assigned customers
    if (req.user.role.name === "RM") {
      const customers = await Customer.find({
        relationshipManager: req.user._id,
      });
      const customerIds = customers.map((c) => c._id);
      query.customer = { $in: customerIds };
    }

    const accounts = await Account.find(query)
      .populate("customer", "firstName lastName email customerId")
      .sort({ createdAt: -1 });

    const formattedAccounts = accounts.map((acc) => ({
      ...acc.toObject(),
      balanceDisplay: formatCurrencyDisplay(acc.balanceInCents),
    }));

    res.json(formattedAccounts);
  } catch (error) {
    console.error("Get accounts error:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
};

const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await Account.findById(id).populate("customer");

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check authorization
    if (req.user.role.name === "RM") {
      const customer = await Customer.findById(account.customer._id);
      if (customer.relationshipManager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    res.json({
      ...account.toObject(),
      balanceDisplay: formatCurrencyDisplay(account.balanceInCents),
    });
  } catch (error) {
    console.error("Get account error:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
};

const createAccount = async (req, res) => {
  try {
    const { customerId, accountType, initialBalance } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const balanceInCents = Math.round((initialBalance || 0) * 100);

    const account = new Account({
      accountNumber: generateAccountNumber(),
      accountType,
      customer: customerId,
      balanceInCents,
      accountStatus: "ACTIVE",
    });

    await account.save();
    await account.populate("customer");

    await logAudit(
      req.user._id,
      "ACCOUNT_CREATED",
      "Account",
      account._id,
      { accountType, initialBalance },
      "SUCCESS",
      req,
    );

    res.status(201).json({
      ...account.toObject(),
      balanceDisplay: formatCurrencyDisplay(account.balanceInCents),
    });
  } catch (error) {
    console.error("Create account error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

const updateAccountStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;
    const validStatuses = ["ACTIVE", "DORMANT", "CLOSED"];

    if (!validStatuses.includes(accountStatus)) {
      return res.status(400).json({ error: "Invalid account status" });
    }

    const account = await Account.findById(id);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const previousStatus = account.accountStatus;
    account.accountStatus = accountStatus;
    account.closingDate = accountStatus === "CLOSED" ? new Date() : null;
    account.updatedAt = Date.now();

    await account.save();
    await account.populate("customer");

    await logAudit(
      req.user._id,
      "ACCOUNT_STATUS_UPDATED",
      "Account",
      account._id,
      { previousStatus, accountStatus },
      "SUCCESS",
      req,
    );

    res.json({
      ...account.toObject(),
      balanceDisplay: formatCurrencyDisplay(account.balanceInCents),
    });
  } catch (error) {
    console.error("Update account status error:", error);
    res.status(500).json({ error: "Failed to update account status" });
  }
};

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccountStatus,
};
