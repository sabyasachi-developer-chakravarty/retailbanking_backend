const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: "../backend/.env" });

const Role = require("./src/models/Role");
const User = require("./src/models/User");
const Customer = require("./src/models/Customer");
const Account = require("./src/models/Account");

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("Connected to MongoDB");

    // Clear existing data (ONLY for development/testing)
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Customer.deleteMany({}),
      Account.deleteMany({}),
    ]);

    console.log("Cleared existing data");

    // Create Roles
    const adminRole = new Role({
      name: "ADMIN",
      description: "Administrator with full access",
      permissions: [
        "view_accounts",
        "create_transaction",
        "approve_transaction",
        "reject_transaction",
        "view_all_accounts",
        "manage_accounts",
        "manage_users",
        "view_audit_logs",
      ],
    });

    const rmRole = new Role({
      name: "RM",
      description: "Relationship Manager",
      permissions: ["view_accounts", "create_transaction"],
    });

    const opsRole = new Role({
      name: "OPS",
      description: "Operations User",
      permissions: [
        "view_all_accounts",
        "approve_transaction",
        "reject_transaction",
        "manage_accounts",
      ],
    });

    const savedRoles = await Promise.all([
      adminRole.save(),
      rmRole.save(),
      opsRole.save(),
    ]);

    console.log("Roles created");

    // Create Users
    const adminUser = new User({
      username: "admin",
      email: "admin@bank.com",
      password: "Admin@123",
      firstName: "System",
      lastName: "Administrator",
      role: savedRoles[0]._id,
    });

    const rmUser = new User({
      username: "rm001",
      email: "rm@bank.com",
      password: "RM@123456",
      firstName: "John",
      lastName: "Manager",
      role: savedRoles[1]._id,
    });

    const opsUser = new User({
      username: "ops001",
      email: "ops@bank.com",
      password: "Ops@123456",
      firstName: "Jane",
      lastName: "Operator",
      role: savedRoles[2]._id,
    });

    const savedUsers = await Promise.all([
      adminUser.save(),
      rmUser.save(),
      opsUser.save(),
    ]);

    console.log("Users created");

    // Create Customers
    const customer1 = new Customer({
      customerId: `CUST-${Date.now()}-00001`,
      firstName: "Robert",
      lastName: "Johnson",
      email: "robert.johnson@email.com",
      phone: "+1-555-0101",
      dateOfBirth: new Date("1990-05-15"),
      kycStatus: "VERIFIED",
      relationshipManager: savedUsers[1]._id,
      address: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001",
        country: "USA",
      },
    });

    const customer2 = new Customer({
      customerId: `CUST-${Date.now()}-00002`,
      firstName: "Sarah",
      lastName: "Williams",
      email: "sarah.williams@email.com",
      phone: "+1-555-0102",
      dateOfBirth: new Date("1985-08-22"),
      kycStatus: "VERIFIED",
      relationshipManager: savedUsers[1]._id,
      address: {
        street: "456 Oak Ave",
        city: "Los Angeles",
        state: "CA",
        zipCode: "90001",
        country: "USA",
      },
    });

    const savedCustomers = await Promise.all([
      customer1.save(),
      customer2.save(),
    ]);

    console.log("Customers created");

    // Create Accounts
    const account1 = new Account({
      accountNumber: `ACC-${Date.now()}-001`,
      accountType: "SAVINGS",
      customer: savedCustomers[0]._id,
      balanceInCents: 500000, // $5000.00
      accountStatus: "ACTIVE",
    });

    const account2 = new Account({
      accountNumber: `ACC-${Date.now()}-002`,
      accountType: "CHECKING",
      customer: savedCustomers[0]._id,
      balanceInCents: 250000, // $2500.00
      accountStatus: "ACTIVE",
    });

    const account3 = new Account({
      accountNumber: `ACC-${Date.now()}-003`,
      accountType: "SAVINGS",
      customer: savedCustomers[1]._id,
      balanceInCents: 1000000, // $10000.00
      accountStatus: "ACTIVE",
    });

    await Promise.all([account1.save(), account2.save(), account3.save()]);

    console.log("Accounts created");

    console.log("\n=== SEED DATA CREATED SUCCESSFULLY ===");
    console.log("\nTest Credentials:");
    console.log("Admin: username=admin, password=Admin@123");
    console.log("RM: username=rm001, password=RM@123456");
    console.log("Ops: username=ops001, password=Ops@123456");

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
