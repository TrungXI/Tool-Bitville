# Hướng dẫn thêm Provider mới

## Tổng quan

Để thêm một provider mới vào hệ thống, bạn cần thực hiện các bước sau:

1. ✅ Thêm Provider Config trong `providers.tsx`
2. ✅ Thêm Account Permissions trong `accounts/newprovider.tsx`
3. ✅ Tạo Test Cases file trong `testcases/newprovider.tsx`
4. ✅ Export Test Cases trong `testcases/index.tsx`

---

## Bước 1: Thêm Provider Config

**File:** `src/hardcoded/providers.tsx`

### 1.1. Tạo Payload Builder (nếu cần)

```typescript
const buildNewProviderPayload: ProviderPayloadBuilder = (input, context) => {
    return {
        provider: "newprovider",
        // Map các context fields vào payload
        operatorId: context.operatorId,
        playerId: context.playerId,
        amount: input.amount,
        // ... các fields khác
        meta: {
            timestamp: new Date().toISOString()
        }
    };
};
```

### 1.2. Thêm Provider Definition

```typescript
export const PROVIDERS: Record<string, ProviderDef> = {
    // ... existing providers
    
    newprovider: {
        key: "newprovider",
        label: "New Provider",
        
        // 1. Provider Input Fields (fields user nhập khi test)
        fields: [
            { 
                key: "amount", 
                label: "Amount", 
                required: true, 
                type: "number", 
                placeholder: "1000" 
            },
            // Thêm các fields khác nếu cần
        ],
        
        // 2. Context Fields (fields hiển thị ở left panel)
        contextFields: [
            { key: "url", label: "Url", required: true, placeholder: "https://api.newprovider.com" },
            { key: "operatorId", label: "Operator Id", required: true, placeholder: "operator123" },
            { key: "apiKey", label: "API Key", required: true, placeholder: "api_key_here" },
            // Thêm các context fields khác theo provider
            // Mỗi provider có thể có context fields khác nhau
        ],
        
        // 3. Response Field Mappings (quan trọng!)
        // Định nghĩa các field paths trong response của provider này
        responseFields: {
            balance: "balance",              // Hoặc "data.balance" nếu nested
            errorMessage: "message",         // Hoặc "error.message"
            errorCode: "err",                // Hoặc "error.code"
            status: "status",                // Hoặc "data.status"
            transactionId: "id",             // Hoặc "data.id"
            amount: "amount"                 // Hoặc "data.amount"
        },
        
        // 4. Payload Builder (optional)
        buildPayload: buildNewProviderPayload
    }
};
```

**Lưu ý quan trọng:**
- `responseFields` rất quan trọng vì nó định nghĩa cách lấy balance, error message, etc. từ response
- Nếu provider có cấu trúc response khác (ví dụ: `{ data: { balance: 1000 } }`), cần config `balance: "data.balance"`

---

## Bước 2: Thêm Account Permissions

**File:** `src/hardcoded/accounts/newprovider.ts` (tạo file mới)

### 2.1. Tạo Provider Accounts File

Mỗi provider có file riêng trong `accounts/` folder:

```typescript
import type { AccountProviderDefaults } from "./types";

/**
 * NewProvider Accounts Configuration
 * 
 * Định nghĩa:
 * - accounts: Danh sách email accounts có quyền access provider này
 * - defaults: Default values cho từng account (nếu khác nhau)
 */
export const NEWPROVIDER_ACCOUNTS = {
    // Danh sách accounts có quyền access NewProvider
    accounts: [
        "admin@example.com",
        "user1@example.com"
    ],
    
    // Default values cho từng account
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                amount: 1000
            },
            contextDefaults: {
                url: "https://api.newprovider.com",
                operatorId: "operator_newprovider_001",
                apiKey: "api_key_newprovider"
            }
        },
        "user1@example.com": {
            inputDefaults: {
                amount: 500
            },
            contextDefaults: {}
        }
    } as Record<string, AccountProviderDefaults>
};
```

### 2.2. Export trong accounts/index.tsx

**File:** `src/hardcoded/accounts/index.tsx`

```typescript
import { NEWPROVIDER_ACCOUNTS } from "./newprovider";

const PROVIDER_ACCOUNTS: Record<string, ...> = {
    // ... existing providers
    newprovider: NEWPROVIDER_ACCOUNTS  // Thêm vào đây
};
```

**Lưu ý:**
- Mỗi provider có file riêng trong `accounts/` folder
- Chỉ cần list accounts có quyền trong `accounts` array
- Default values được config per account trong `defaults` object
- `inputDefaults`: Default values cho provider input fields
- `contextDefaults`: Default values cho context fields

---

## Bước 3: Tạo Test Cases

**File:** `src/hardcoded/testcases/newprovider.tsx`

### 3.1. Tạo Test Suite

```typescript
import type { ProviderSuite } from "./_types";

export const NEWPROVIDER_SUITE: ProviderSuite = {
    provider: "newprovider",
    title: "New Provider Test Suite",
    cases: [
        {
            id: "auth_valid",
            title: "Authenticate With Valid Parameters",
            expected: "Authenticate success",
            steps: [
                {
                    id: "authenticate",
                    title: "Authenticate",
                    method: "POST",
                    url: "{{context.url}}/authenticate",
                    headers: { 
                        // Sử dụng context fields
                        "API-Key": "{{context.apiKey}}" 
                    },
                    body: { 
                        operatorId: "{{context.operatorId}}",
                        // ... 
                    },
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "token" }
                    ]
                }
            ]
        },
        
        {
            id: "debit_flow",
            title: "Debit Flow",
            expected: "Debit success",
            steps: [
                {
                    id: "get_balance",
                    title: "Get Balance",
                    method: "GET",
                    url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    extract: [
                        // Sử dụng responseFields.balance config
                        { var: "balanceBefore", from: "json", path: "balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] },
                        { type: "json_path_exists", path: "balance" }
                    ]
                },
                {
                    id: "debit",
                    title: "Create Debit",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    body: {
                        operatorId: "{{context.operatorId}}",
                        playerId: "{{context.playerId}}",
                        amount: "{{input.amount}}"
                    },
                    extract: [
                        { var: "debitId", from: "json", path: "id" },
                        { var: "debitAmount", from: "json", path: "amount" },
                        { var: "balanceAfterDebit", from: "json", path: "balance" }
                    ],
                    dependsOn: ["get_balance"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        {
                            type: "custom",
                            name: "balance_in_response",
                            params: {
                                beforeVar: "balanceBefore",
                                amountVar: "debitAmount",
                                operation: "debit"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};
```

**Lưu ý:**
- Sử dụng `{{context.xxx}}` cho context fields
- Sử dụng `{{input.xxx}}` cho provider input fields
- Sử dụng `{{vars.xxx}}` cho variables từ steps trước
- Extract paths nên match với `responseFields` config
- Sử dụng `dependsOn` để đảm bảo thứ tự thực thi

---

## Bước 4: Export Test Cases

**File:** `src/hardcoded/testcases/index.tsx`

```typescript
import { STRIPE_SUITE } from "./stripe";
import { SHOPE_SUITE } from "./shope";
import { NEWPROVIDER_SUITE } from "./newprovider";  // Import mới
import type { ProviderSuite } from "./_types";

export const TEST_SUITES: Record<string, ProviderSuite> = {
    stripe: STRIPE_SUITE,
    shope: SHOPE_SUITE,
    newprovider: NEWPROVIDER_SUITE  // Export mới
};

export type { ProviderSuite, TestCaseDef, StepDef, AssertRule, ExtractRule, HttpMethod } from "./_types";
```

---

## Checklist tổng hợp

Khi thêm provider mới, đảm bảo:

- [ ] **providers.tsx**
  - [ ] Thêm `fields` (provider input fields)
  - [ ] Thêm `contextFields` (context fields cho left panel)
  - [ ] Thêm `responseFields` (field mappings cho balance, error message, etc.)
  - [ ] Thêm `buildPayload` function (nếu cần)

- [ ] **accounts/newprovider.tsx** (tạo file mới)
  - [ ] Tạo file mới với `NEWPROVIDER_ACCOUNTS`
  - [ ] Thêm `accounts` array (danh sách emails có quyền)
  - [ ] Thêm `defaults` object (default values per account)
  - [ ] Export trong `accounts/index.ts`

- [ ] **testcases/newprovider.tsx**
  - [ ] Tạo file mới với test suite
  - [ ] Định nghĩa các test cases
  - [ ] Sử dụng đúng template variables (`{{context.xxx}}`, `{{input.xxx}}`, `{{vars.xxx}}`)
  - [ ] Extract paths match với `responseFields` config
  - [ ] Sử dụng `dependsOn` cho dependencies

- [ ] **testcases/index.tsx**
  - [ ] Import test suite mới
  - [ ] Export trong `TEST_SUITES`

---

## Ví dụ hoàn chỉnh: Thêm Provider "Alea"

### 1. providers.ts

```typescript
const buildAleaPayload: ProviderPayloadBuilder = (input, context) => {
    return {
        provider: "alea",
        merchantId: context.merchantId,
        playerId: context.playerId,
        amount: input.amount,
        gameId: context.gameId
    };
};

export const PROVIDERS: Record<string, ProviderDef> = {
    // ... existing
    alea: {
        key: "alea",
        label: "Alea",
        fields: [
            { key: "amount", label: "Amount", required: true, type: "number", placeholder: "1000" }
        ],
        contextFields: [
            { key: "url", label: "Url", required: true, placeholder: "https://api.alea.com" },
            { key: "merchantId", label: "Merchant Id", required: true, placeholder: "merchant123" },
            { key: "apiKey", label: "API Key", required: true, placeholder: "api_key_here" },
            { key: "playerId", label: "Player Id", required: true, placeholder: "player123" },
            { key: "gameId", label: "Game Id", required: true, placeholder: "game123" }
        ],
        responseFields: {
            balance: "data.balance",
            errorMessage: "error.msg",
            errorCode: "error.code",
            status: "data.status",
            transactionId: "data.transactionId",
            amount: "data.amount"
        },
        buildPayload: buildAleaPayload
    }
};
```

### 2. accounts/alea.ts

```typescript
import type { AccountProviderDefaults } from "./types";

export const ALEA_ACCOUNTS = {
    accounts: [
        "admin@example.com"
    ],
    defaults: {
        "admin@example.com": {
            inputDefaults: {
                amount: 1500
            },
            contextDefaults: {
                url: "https://api.alea.com",
                merchantId: "merchant_alea_001",
                apiKey: "api_key_alea_admin",
                playerId: "player_alea_001",
                gameId: "game_alea_001"
            }
        }
    } as Record<string, AccountProviderDefaults>
};
```

### 2b. accounts/index.tsx

```typescript
import { ALEA_ACCOUNTS } from "./alea";

const PROVIDER_ACCOUNTS: Record<string, ...> = {
    // ... existing
    alea: ALEA_ACCOUNTS
};
```

### 3. testcases/alea.ts

```typescript
import type { ProviderSuite } from "./_types";

export const ALEA_SUITE: ProviderSuite = {
    provider: "alea",
    title: "Alea Test Suite",
    cases: [
        {
            id: "debit_flow",
            title: "Debit Flow",
            expected: "Debit success",
            steps: [
                {
                    id: "get_balance",
                    title: "Get Balance",
                    method: "GET",
                    url: "{{context.url}}/getbalance?merchantId={{context.merchantId}}&playerId={{context.playerId}}",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    extract: [
                        { var: "balanceBefore", from: "json", path: "data.balance" }
                    ],
                    assert: [
                        { type: "status_in", expected: [200] }
                    ]
                },
                {
                    id: "debit",
                    title: "Create Debit",
                    method: "POST",
                    url: "{{context.url}}/debit",
                    headers: { "API-Key": "{{context.apiKey}}" },
                    body: {
                        merchantId: "{{context.merchantId}}",
                        playerId: "{{context.playerId}}",
                        amount: "{{input.amount}}",
                        gameId: "{{context.gameId}}"
                    },
                    extract: [
                        { var: "debitId", from: "json", path: "data.transactionId" },
                        { var: "balanceAfterDebit", from: "json", path: "data.balance" }
                    ],
                    dependsOn: ["get_balance"],
                    assert: [
                        { type: "status_in", expected: [200, 201] },
                        {
                            type: "custom",
                            name: "balance_in_response",
                            params: {
                                beforeVar: "balanceBefore",
                                amountVar: "amount",
                                operation: "debit"
                            }
                        }
                    ]
                }
            ]
        }
    ]
};
```

### 4. testcases/index.tsx

```typescript
import { STRIPE_SUITE } from "./stripe";
import { SHOPE_SUITE } from "./shope";
import { ALEA_SUITE } from "./alea";
import type { ProviderSuite } from "./_types";

export const TEST_SUITES: Record<string, ProviderSuite> = {
    stripe: STRIPE_SUITE,
    shope: SHOPE_SUITE,
    alea: ALEA_SUITE
};
```

---

## Testing

Sau khi thêm provider mới:

1. **Restart server**: `bun run dev`
2. **Login** với account có permission cho provider mới
3. **Select provider** trong dropdown
4. **Verify**:
   - Context fields hiển thị đúng
   - Provider input fields hiển thị đúng
   - Default values được fill đúng
   - Test cases load được
   - Run test cases thành công

---

## Troubleshooting

### Provider không hiển thị trong dropdown?
- ✅ Check account có provider trong `accounts/index.tsx`
- ✅ Check provider key match giữa `providers.tsx` và `accounts/index.tsx`

### Test cases không load?
- ✅ Check export trong `testcases/index.tsx`
- ✅ Check provider key match giữa `providers.tsx` và test suite

### Balance/Error message không extract được?
- ✅ Check `responseFields` config match với cấu trúc response thực tế
- ✅ Check extract paths trong test cases match với `responseFields`

### Assertions fail?
- ✅ Check response structure có đúng không
- ✅ Check field paths trong assertions
- ✅ Check `responseFields` config đúng chưa

