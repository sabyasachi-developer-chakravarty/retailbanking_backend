const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const {
  generateCorrelationId,
  parseCurrencyInput,
  formatCurrencyDisplay,
} = require("../utils/helpers");
const { logAudit } = require("../middleware/audit");

const getTransactionHistory = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { status, limit = 50, skip = 0 } = req.query;

    console.log(
      "Fetching transaction history for account:",
      accountId,
      "with status:",
      status,
    );

    const account = await Account.findById(accountId).populate("customer");
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Check authorization
    if (req.user.role.name === "RM") {
      const customer = account.customer;
      // Verify RM is assigned to this customer
      if (customer.relationshipManager.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const query = { account: accountId };
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ initiatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate("initiatedBy", "username firstName lastName")
      .populate("approvedBy", "username firstName lastName");

    const total = await Transaction.countDocuments(query);

    const formattedTransactions = transactions.map((txn) => ({
      ...txn.toObject(),
      amountDisplay: formatCurrencyDisplay(txn.amountInCents),
      balanceDisplay: formatCurrencyDisplay(txn.balanceAfterTransaction),
    }));

    res.json({
      transactions: formattedTransactions,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (error) {
    console.error("Get transaction history error:", error);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
};

const initiateTransaction = async (req, res) => {
  try {
    const { accountId, type, amount, description } = req.body;

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    if (account.accountStatus !== "ACTIVE") {
      return res.status(400).json({ error: "Account is not active" });
    }

    const amountInCents = parseCurrencyInput(amount);

    // Business rule: Debit cannot exceed available balance
    if (type === "DEBIT" && amountInCents > account.balanceInCents) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const correlationId = generateCorrelationId();
    const balanceAfter =
      type === "DEBIT"
        ? account.balanceInCents - amountInCents
        : account.balanceInCents + amountInCents;

    const transaction = new Transaction({
      correlationId,
      account: accountId,
      type,
      amountInCents,
      status: "INITIATED",
      description,
      initiatedBy: req.user._id,
      balanceAfterTransaction: balanceAfter,
    });

    await transaction.save();
    await transaction.populate("initiatedBy", "username firstName lastName");

    await logAudit(
      req.user._id,
      "TRANSACTION_INITIATED",
      "Transaction",
      transaction._id,
      { type, amount, correlationId },
      "SUCCESS",
      req,
    );

    res.status(201).json({
      ...transaction.toObject(),
      amountDisplay: formatCurrencyDisplay(transaction.amountInCents),
    });
  } catch (error) {
    console.error("Initiate transaction error:", error);
    res.status(500).json({ error: "Failed to initiate transaction" });
  }
};

const getPendingTransactions = async (req, res) => {
  try {
    const query = { status: "INITIATED" };

    const transactions = await Transaction.find(query)
      .sort({ initiatedAt: -1 })
      .populate("account")
      .populate("initiatedBy", "username firstName lastName");

    const formattedTransactions = transactions.map((txn) => ({
      ...txn.toObject(),
      amountDisplay: formatCurrencyDisplay(txn.amountInCents),
    }));

    res.json(formattedTransactions);
  } catch (error) {
    console.error("Get pending transactions error:", error);
    res.status(500).json({ error: "Failed to fetch pending transactions" });
  }
};

const approveTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approvalNotes } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.status !== "INITIATED") {
      return res.status(400).json({ error: "Transaction cannot be approved" });
    }

    const account = await Account.findById(transaction.account);

    // Atomic update
    const updateData = {
      status: "APPROVED",
      approvedBy: req.user._id,
      approvalNotes,
      approvedAt: new Date(),
    };

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      updateData,
      { new: true },
    )
      .populate("initiatedBy")
      .populate("approvedBy");

    // Update account balance
    if (transaction.type === "DEBIT") {
      account.balanceInCents -= transaction.amountInCents;
    } else {
      account.balanceInCents += transaction.amountInCents;
    }

    account.updatedAt = new Date();
    await account.save();

    // Mark as completed
    updatedTransaction.status = "COMPLETED";
    updatedTransaction.completedAt = new Date();
    await updatedTransaction.save();

    await logAudit(
      req.user._id,
      "TRANSACTION_APPROVED",
      "Transaction",
      transaction._id,
      { approvalNotes },
      "SUCCESS",
      req,
    );

    res.json(updatedTransaction);
  } catch (error) {
    console.error("Approve transaction error:", error);
    res.status(500).json({ error: "Failed to approve transaction" });
  }
};

const rejectTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approvalNotes } = req.body;

    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.status !== "INITIATED") {
      return res.status(400).json({ error: "Transaction cannot be rejected" });
    }

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        status: "REJECTED",
        approvedBy: req.user._id,
        approvalNotes,
        approvedAt: new Date(),
      },
      { new: true },
    )
      .populate("initiatedBy")
      .populate("approvedBy");

    await logAudit(
      req.user._id,
      "TRANSACTION_REJECTED",
      "Transaction",
      transaction._id,
      { approvalNotes },
      "SUCCESS",
      req,
    );

    res.json(updatedTransaction);
  } catch (error) {
    console.error("Reject transaction error:", error);
    res.status(500).json({ error: "Failed to reject transaction" });
  }
};

module.exports = {
  getTransactionHistory,
  initiateTransaction,
  getPendingTransactions,
  approveTransaction,
  rejectTransaction,
};
