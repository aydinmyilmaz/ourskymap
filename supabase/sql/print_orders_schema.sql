create extension if not exists pgcrypto;

create table if not exists public.print_orders (
  id uuid primary key default gen_random_uuid(),
  print_order_code varchar(50) unique not null,
  source_order_code varchar(50) not null,
  source_product_type varchar(20) not null,
  artwork_source_type varchar(20) not null,
  artwork_url text not null,
  print_option varchar(40) not null,
  size varchar(20) not null,
  quantity int not null,
  currency char(3) not null,
  unit_price_cents int not null,
  subtotal_cents int not null,
  shipping_cents int not null,
  total_cents int not null,
  customer_email varchar(255),
  shipping_name varchar(255) not null,
  phone varchar(60),
  address_line1 varchar(255) not null,
  address_line2 varchar(255),
  city varchar(120) not null,
  state_region varchar(120),
  postal_code varchar(40) not null,
  country_code char(2) not null,
  payment_provider varchar(30) not null,
  payment_status varchar(40) not null,
  provider_name varchar(40),
  provider_order_id varchar(120),
  provider_status varchar(40) not null default 'not_submitted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_print_orders_code on public.print_orders(print_order_code);
create index if not exists idx_print_orders_source_code on public.print_orders(source_order_code);
create index if not exists idx_print_orders_payment on public.print_orders(payment_status);
create index if not exists idx_print_orders_provider_status on public.print_orders(provider_status);
create index if not exists idx_print_orders_created_at on public.print_orders(created_at);
