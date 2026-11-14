  -- Skema TiDB untuk data yang saat ini tersimpan di koleksi Firestore.
  -- Jalankan seluruh file ini di TiDB Cloud atau TiDB Server.

  CREATE DATABASE IF NOT EXISTS kravent_bike
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

  USE kravent_bike;

  CREATE TABLE IF NOT EXISTS bikes (
    id VARCHAR(128) NOT NULL,
    name VARCHAR(160) NOT NULL,
    brand VARCHAR(160) NOT NULL,
    category VARCHAR(32) NOT NULL,
    frame_size VARCHAR(120) NOT NULL,
    color VARCHAR(120) NOT NULL,
    price_per_hour DECIMAL(14, 2) NOT NULL DEFAULT 0,
    price_per_day DECIMAL(14, 2) NOT NULL DEFAULT 0,
    image_url MEDIUMTEXT NOT NULL,
    description TEXT NOT NULL,
    gear_system VARCHAR(160) NOT NULL,
    status VARCHAR(32) NOT NULL,
    license_number VARCHAR(64) NOT NULL,
    total_rented_count INT UNSIGNED NOT NULL DEFAULT 0,
    deposit_required DECIMAL(14, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_bikes_status (status),
    KEY idx_bikes_license_number (license_number)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(128) NOT NULL,
    booking_code VARCHAR(64) NOT NULL,
    bike_id VARCHAR(128) NOT NULL,
    bike_name VARCHAR(160) NOT NULL,
    bike_image MEDIUMTEXT NOT NULL,
    customer_name VARCHAR(160) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(254) NULL,
    id_card_number VARCHAR(32) NULL,
    start_date DATE NOT NULL,
    start_time VARCHAR(5) NOT NULL,
    end_date DATE NOT NULL,
    end_time VARCHAR(5) NOT NULL DEFAULT '',
    duration_type VARCHAR(16) NULL,
    duration_value DECIMAL(8, 2) NULL,
    booking_session VARCHAR(16) NULL,
    total_price DECIMAL(14, 2) NOT NULL DEFAULT 0,
    deposit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    payment_status VARCHAR(32) NOT NULL,
    notes TEXT NULL,
    created_at DATETIME(3) NOT NULL,
    returned_at DATETIME(3) NULL,
    actual_start_date DATE NULL,
    actual_start_time VARCHAR(5) NULL,
    handover_by VARCHAR(160) NULL,
    payment_notes TEXT NULL,
    fee_payment_method VARCHAR(64) NULL,
    swapped_from_bike_id VARCHAR(128) NULL,
    swapped_from_bike_name VARCHAR(160) NULL,
    swapped_at DATETIME(3) NULL,
    actual_return_date DATE NULL,
    actual_return_time VARCHAR(5) NULL,
    late_minutes INT NULL,
    late_extra_hours DECIMAL(8, 2) NULL,
    late_fee DECIMAL(14, 2) NULL,
    final_total_price DECIMAL(14, 2) NULL,
    return_notes TEXT NULL,
    discount_percent DECIMAL(7, 4) NULL,
    discount_nominal DECIMAL(14, 2) NULL,
    group_booking_code VARCHAR(64) NULL,
    group_item_index INT NULL,
    group_item_total INT NULL,
    addons JSON NULL,
    addon_total_cost DECIMAL(14, 2) NULL,
    approved_at DATETIME(3) NULL,
    approved_by VARCHAR(160) NULL,
    rejection_reason TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_bookings_bike_schedule (bike_id, start_date, end_date, status),
    KEY idx_bookings_start_date_status (start_date, status),
    KEY idx_bookings_actual_return_date (actual_return_date),
    KEY idx_bookings_created_at (created_at),
    KEY idx_bookings_group_code (group_booking_code),
    KEY idx_bookings_customer_phone (customer_phone)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(128) NOT NULL,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(32) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL,
    description TEXT NULL,
    bike_id VARCHAR(128) NULL,
    receipt_proof MEDIUMTEXT NULL,
    PRIMARY KEY (id),
    KEY idx_expenses_date_category (expense_date, category),
    KEY idx_expenses_bike_id (bike_id)
  );

  CREATE TABLE IF NOT EXISTS financial_settings (
    id VARCHAR(64) NOT NULL,
    monthly_capital_by_month JSON NULL,
    partner1_name VARCHAR(160) NOT NULL,
    partner1_percentage DECIMAL(7, 4) NOT NULL,
    partner2_name VARCHAR(160) NOT NULL,
    partner2_percentage DECIMAL(7, 4) NOT NULL,
    maintenance_budget_percentage DECIMAL(7, 4) NOT NULL,
    maintenance_budget_nominal DECIMAL(14, 2) NULL,
    maintenance_mode VARCHAR(32) NULL,
    content_budget_amount DECIMAL(14, 2) NOT NULL,
    content_budget_percentage DECIMAL(7, 4) NULL,
    operational_budget_percentage DECIMAL(7, 4) NOT NULL,
    calculation_mode VARCHAR(40) NOT NULL,
    PRIMARY KEY (id)
  );

  -- Pengaturan default aplikasi. Tidak menimpa data jika baris "default" sudah ada.
  INSERT IGNORE INTO financial_settings (
    id,
    partner1_name,
    partner1_percentage,
    partner2_name,
    partner2_percentage,
    maintenance_budget_percentage,
    maintenance_budget_nominal,
    maintenance_mode,
    content_budget_amount,
    content_budget_percentage,
    operational_budget_percentage,
    calculation_mode
  )
  VALUES (
    'default',
    'Owner',
    60,
    'Investor',
    40,
    15,
    0,
    'percentage',
    500000,
    10,
    15,
    'percentage_from_gross'
  );
