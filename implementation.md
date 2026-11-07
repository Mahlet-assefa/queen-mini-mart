# Specification: Queen Mart Sales & Inventory Management System

Build a full-stack, production-ready web application for "Queen Mart" (a supermarket/mini-mart). The application must feature role-based authorization (Admin vs. Sales), dynamic financial reporting, automated stock adjustment workflows, order management with bulk auto-replenishment, and an interactive daily activity calendar.

---

## 1. Tech Stack & Architecture Standards
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI / Radix UI components, Recharts for dynamic charts.
- **Backend**: Node.js with Express or Next.js API Routes (Route Handlers), TypeScript.
- **Database & ORM**: PostgreSQL with Prisma ORM.
- **State Management & Data Fetching**: React Query (TanStack Query) or Server Actions.
- **Design System**: Clean, minimal, modern UI with clear visual contrast (Green `#16a34a` for additions/income, Red `#dc2626` for sales/expenditures).

---

## 2. Authentication & Role-Based Access Control (RBAC)

### Rules & Flow
- **Auth Model**: Email-only sign-in and sign-up (No password or third-party OAuth required).
- **Admin Authentication**: Hardcoded / Seeded single Super Admin (`admin@queenmart.com`). 
- **Sales Authentication**: Standard sign-up and sign-in via email.
- **Branding**: Simple Queen Mart supermarket logo, clean minimal modern layout. No social log-ins.

### Permissions Matrix
| Feature / View | Admin Access | Sales Access |
| :--- | :--- | :--- |
| **Dashboard** | Full Access (Net Profit, Costs, Stock Values, Top 5 Items) | Hidden / Restricted |
| **Products List** | View Purchase Price, Selling Price, Margin, Full Controls | View Selling Price ONLY |
| **Product Quick Adjust (+ / -)** | Add Stock / Record Sale | Add Stock / Record Sale |
| **Finance Section** | Full Access (Daily, Monthly, Yearly Tabs & Profit Analysis) | Restricted to Daily Cash Summary ONLY |
| **Orders Section** | Full Access + Low Stock Auto-Order / Bulk Select | Full Access to Create/Export Orders |
| **Date Tracker (Calendar)** | Full Access | Hidden or View-Only |

---

## 3. Database Schema (`schema.prisma`)

Set up PostgreSQL with the following database schema (Note: `sku` and `description` are explicitly omitted):

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  SALES
}

enum TransactionType {
  ADD_STOCK
  SALE
}

enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      Role     @default(SALES)
  createdAt DateTime @default(now())
}

model Category {
  id       String    @id @default(uuid())
  name     String    @unique
  products Product[]
}

model Product {
  id             String            @id @default(uuid())
  name           String
  categoryId     String
  category       Category          @relation(fields: [categoryId], references: [id])
  purchasedPrice Float             // Visible to ADMIN only
  sellingPrice   Float             // Visible to ADMIN & SALES
  stockQuantity  Int               @default(0)
  minStockLevel  Int               @default(5) // Threshold for Low Stock
  transactions   TransactionItem[]
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
}

model Transaction {
  id        String            @id @default(uuid())
  type      TransactionType
  totalAmount Float
  totalCost   Float?          // Calculated for profit tracking
  createdAt DateTime          @default(now())
  items     TransactionItem[]
}

model TransactionItem {
  id            String      @id @default(uuid())
  transactionId String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  productId     String
  product       Product     @relation(fields: [productId], references: [id])
  quantity      Int
  unitPrice     Float       // Historical selling price at moment of sale
  unitCost      Float       // Historical purchase price at moment of sale
}

model Order {
  id          String      @id @default(uuid())
  orderDate   DateTime    @default(now())
  status      OrderStatus @default(PENDING)
  totalItems  Int
  items       OrderItem[]
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productName String
  quantity  Int
}
4. UI & Detailed Module Specifications
Module 1: Admin Dashboard
Top Summary Cards (Clicking "View Details" opens a pop-up modal with detailed tabular data, alphabetical sorting, and date filtering):

Total Sold Items: Modal shows Date Sold, Item Name, Selling Price, Quantity, Total Revenue.

Net Profit: Total Revenue minus Total Cost for sold items. Modal breaks down daily profit contributions.

Total Inventory Count: Total quantity of all items in store. Modal lists all products, stock counts, and total valuation.

Active Categories: Total categories count. Modal lists categories and item count per category.

Low Stock Alert: Total items where stockQuantity <= minStockLevel. Modal lists low-stock items with quick-reorder action buttons.

Bottom Section:

Top 5 Selling Items: Card displaying the top 5 most frequently sold products.

Quick Utility Bar: Mini-mart operational shortcuts (Quick stock addition modal trigger, register daily closing shortcut).

Module 2: Products Management (Admin & Sales View)
Header Actions: Top-right + Add Product button. Triggers a pop-up modal with form fields: Name, Category, Purchased Price (Admin only), Selling Price, Initial Stock, Low Stock Threshold.

Top Controls: Real-time search input bar and "Sort by Name" (A-Z, Z-A) dropdown.

Product Table:

Columns: Product Name, Category, Stock Quantity, Selling Price, Purchased Price (Visible ONLY to Admin), Actions.

Quick Action Buttons:

Large Green + Button: Quick-adds stock quantity. Prompt/modal asks for quantity added.

Large Red - Button: Records a sale. Decrements stock quantity and logs a transaction to the Finance module.

Module 3: Finance Section
Admin View:

Upper section featuring selectable tab/cards for Daily, Monthly, and Yearly financial aggregates.

On clicking any aggregate card, expand or pop up detailed breakdown tables displaying: Revenue, Cost of Goods Sold (COGS), Gross Margin, Net Profit, and itemized transaction logs.

All - (sale) actions taken from the Products table automatically feed into this module.

Sales View:

Displays ONLY Today's Cash Summary (Total cash collected from sales today) to allow sales clerks to reconcile their register balance at end-of-day closing.

Module 4: Order Management
Add Order Modal: Form fields for Product Name, Quantity, and Order Date.

Table Display: Lists all pending and historical supplier orders with export functionality (Export to Excel / CSV).

Low-Stock Automation Controls:

Button 1: "Add All Low Stock Items to Order": Automatically pulls all products meeting low-stock criteria into a new order draft.

Button 2: "Select Low Stock to Order": Opens a checklist pop-up displaying all low-stock items, allowing manual bulk selection before generating the order.

Module 5: Date-Based Activity Tracker (Calendar View)
Calendar Interface: Full-year interactive calendar UI (similar to Google Calendar) with view switcher (Day, Week, Month, Year).

Date Click Action: Clicking any specific date opens a detailed daily activity pop-up showing:

Stock Added (Green): List of items restocked with quantities and purchase costs.

Stock Sold (Red): List of items sold with quantities and sale amounts.

Daily Total: Summary of total units sold vs. total units added, along with net revenue for that day.

Module 6: Usability & UX Enhancements
Toast notifications for low stock alerts when performing sales.

Keyboard-accessible quick-search bar (Ctrl + K).

Defensive validation preventing sales when stockQuantity is 0.

5. Seed File & Initial Configuration Requirements
Provide a prisma/seed.ts script that creates:

One default Admin user (admin@queenmart.com).

Standard mini-mart categories (e.g., Beverages, Dairy, Snacks, Household, Bakery).

Sample products with realistic stock levels and prices.

Generate a README.md containing:

Command-line instructions to start PostgreSQL, run Prisma migrations, run seeds, and launch the dev server (npm run dev).

Environment variables setup (.env.example).

TablePlus / Database GUI connection details (Host, Port, User, Password, Database Name).

6. Execution Command
Implement all frontend components, API handlers, Prisma schemas, and styling fully. Once everything is completed, tested, and ready for production, output done.


***

### Summary of what was specified:
1. **Security & RBAC**: Defined strict visibility rules for Admin vs. Sales (hiding cost/profit metrics from Sales, while keeping price/sales functionality shared).
2. **Schema Realignment**: Purged `sku` and `description` from the database definitions while adding structured models for Transactions, Products, Categories, and Orders.
3. **UX Details**: Standardized the visual language (Green for adding stock/revenue, Red for sales/expenditure), interactive details modals, Excel export capability for orders, and the Google Calendar-style daily activity tracker.