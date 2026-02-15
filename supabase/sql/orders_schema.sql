create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code varchar(50) unique not null,
  status varchar(20) default 'pending' check (status in ('pending', 'completed')),
  customer_email varchar(255),
  location varchar(255),
  date varchar(50),
  time varchar(50),
  title varchar(255),
  names varchar(255),
  font varchar(50),
  pdf_url text,
  used_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_orders_order_code on public.orders(order_code);
create index if not exists idx_orders_status on public.orders(status);
