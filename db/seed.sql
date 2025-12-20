-- Provider demo: "stripe"
insert into providers(key, standard_map, default_headers)
values (
  'stripe',
  '{"authType":"bearer","authField":"apiKey","providerAccountField":"accountId"}',
  '{"Content-Type":"application/json"}'
)
on conflict (key) do nothing;

-- User demo: admin@example.com / admin123
-- password_hash tạo bằng bcrypt -> sẽ seed bằng script Node/Bun (phần dưới)