#!/bin/bash
# File: setup-planorra.sh
# Run: chmod +x setup-planorra.sh && ./setup-planorra.sh

echo "Creating full PlanOrra NestJS structure..."

# Root files
touch src/main.ts
touch src/app.module.ts

# Config
mkdir -p src/config
touch src/config/configuration.ts
touch src/config/typeorm.config.ts

# Common
mkdir -p src/common/{decorators,guards,filters,pipes,enums}

touch src/common/decorators/current-user.decorator.ts
touch src/common/decorators/roles.decorator.ts

touch src/common/guards/jwt-auth.guard.ts
touch src/common/guards/roles.guard.ts
touch src/common/guards/admin.guard.ts

touch src/common/filters/http-exception.filter.ts
touch src/common/pipes/validation.pipe.ts

touch src/common/enums/user-role.enum.ts
touch src/common/enums/ticket-status.enum.ts

# Modules
modules=("auth" "users" "organizations" "team" "events" "tickets" "orders" "payments" "payouts" "locations" "uploads" "admin")

for module in "${modules[@]}"; do
  mkdir -p src/modules/$module/dto
  mkdir -p src/modules/$module/entities
done

# Auth
touch src/modules/auth/auth.module.ts
touch src/modules/auth/auth.controller.ts
touch src/modules/auth/auth.service.ts
touch src/modules/auth/jwt.strategy.ts
touch src/modules/auth/local.strategy.ts
touch src/modules/auth/dto/{login.dto.ts,register.dto.ts,verify-otp.dto.ts}

# Users
touch src/modules/users/users.module.ts
touch src/modules/users/users.controller.ts
touch src/modules/users/users.service.ts
touch src/modules/users/entities/user.entity.ts
touch src/modules/users/dto/{update-profile.dto.ts,update-location.dto.ts}

# Organizations
touch src/modules/organizations/organizations.module.ts
touch src/modules/organizations/organizations.controller.ts
touch src/modules/organizations/organizations.service.ts
touch src/modules/organizations/entities/organization.entity.ts
touch src/modules/organizations/dto/{create-organization.dto.ts,update-organization.dto.ts}

# Team
touch src/modules/team/team.module.ts
touch src/modules/team/team.controller.ts
touch src/modules/team/team.service.ts
touch src/modules/team/dto/{invite-member.dto.ts,update-role.dto.ts}

# Events
touch src/modules/events/events.module.ts
touch src/modules/events/events.controller.ts
touch src/modules/events/events.service.ts
touch src/modules/events/entities/event.entity.ts
touch src/modules/events/dto/{create-event.dto.ts,update-event.dto.ts}

# Tickets
touch src/modules/tickets/tickets.module.ts
touch src/modules/tickets/tickets.controller.ts
touch src/modules/tickets/tickets.service.ts
touch src/modules/tickets/entities/ticket-type.entity.ts
touch src/modules/tickets/dto/{create-ticket.dto.ts,update-ticket.dto.ts}

# Orders
touch src/modules/orders/orders.module.ts
touch src/modules/orders/orders.controller.ts
touch src/modules/orders/orders.service.ts
touch src/modules/orders/entities/order.entity.ts
touch src/modules/orders/entities/order-item.entity.ts
touch src/modules/orders/dto/create-order.dto.ts

# Payments (with Stripe & Paystack folders)
mkdir -p src/modules/payments/stripe
mkdir -p src/modules/payments/paystack

touch src/modules/payments/payments.module.ts
touch src/modules/payments/payments.controller.ts
touch src/modules/payments/payments.service.ts

touch src/modules/payments/stripe/stripe.service.ts
touch src/modules/payments/stripe/stripe.connect.service.ts
touch src/modules/payments/stripe/stripe.webhook.controller.ts

touch src/modules/payments/paystack/paystack.service.ts
touch src/modules/payments/paystack/paystack.webhook.controller.ts

touch src/modules/payments/dto/{create-payment.dto.ts,webhook.dto.ts}

# Payouts
touch src/modules/payouts/payouts.module.ts
touch src/modules/payouts/payouts.service.ts
touch src/modules/payouts/payouts.controller.ts
touch src/modules/payouts/dto/connect-account.dto.ts

# Locations
touch src/modules/locations/locations.module.ts
touch src/modules/locations/dto/update-location.dto.ts

# Uploads (Cloudinary)
touch src/modules/uploads/uploads.module.ts
touch src/modules/uploads/cloudinary.service.ts

# Admin
touch src/modules/admin/admin.module.ts
touch src/modules/admin/admin.controller.ts
touch src/modules/admin/guards/admin.guard.ts

echo "All 80+ folders & files created successfully!"
echo "Now run: yarn install && yarn start:dev"
echo "Let's fucking cook."