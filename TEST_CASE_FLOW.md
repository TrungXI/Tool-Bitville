# Test Case Flow Documentation

## Tổng quan luồng test case

### 1. Cấu trúc Test Case

Mỗi test case bao gồm:
- **id**: Unique identifier
- **title**: Tên test case
- **expected**: Mô tả kết quả mong đợi
- **steps**: Danh sách các bước thực thi

### 2. Luồng thực thi Test Case

```
1. Parse Test Case
   ↓
2. Topological Sort Steps (xử lý dependencies)
   ↓
3. For each step (tuần tự hoặc parallel group):
   a. Template Variables ({{context.xxx}}, {{input.xxx}}, {{vars.xxx}})
   b. Execute HTTP Request
   c. Extract Variables (lưu vào ctx.vars)
   d. Run Assertions
   e. Store Step Result
   ↓
4. Return Test Case Result
```

## Chi tiết từng bước

### Step 1: Template Variables

Trước khi gọi API, các template variables được thay thế:

**Các loại variables:**
- `{{context.xxx}}`: Từ context fields (url, operatorId, secretKey, etc.)
- `{{input.xxx}}`: Từ provider input fields (amount, providerId, etc.)
- `{{vars.xxx}}`: Từ các step trước đó (extracted variables)

**Ví dụ:**
```typescript
url: "{{context.url}}/debit"
body: {
    playerId: "{{context.playerId}}",
    amount: "{{input.amount}}",
    debitId: "{{vars.debitId}}"  // Từ step trước
}
```

### Step 2: Execute HTTP Request

```typescript
const resp = await httpCall(method, url, headers, body);
// Returns: { ok, status, elapsedMs, headers, text, json }
```

### Step 3: Extract Variables

Sau khi nhận response, extract các giá trị vào `ctx.vars`:

```typescript
extract: [
    { var: "debitId", from: "json", path: "id" },
    { var: "balanceBefore", from: "json", path: "balance" }
]
```

**Lưu ý:**
- `from: "json"` hoặc `from: "text"`
- `path`: Dot path để lấy giá trị (e.g., "id", "data.balance", "error.message")
- Các giá trị được lưu vào `ctx.vars[varName]` để dùng cho các step sau

### Step 4: Run Assertions

Các assertions được chạy và kiểm tra:

**Các loại assertions:**
1. `status_in`: Kiểm tra status code có trong danh sách
2. `json_path_eq`: Kiểm tra giá trị tại path bằng expected
3. `json_path_in`: Kiểm tra giá trị tại path có trong danh sách
4. `json_path_exists`: Kiểm tra path có tồn tại
5. `json_path_contains`: Kiểm tra path chứa string
6. `equals_var`: So sánh variable với giá trị
7. `custom`: Custom assertions (balance_decreased, error_message, etc.)

**Ví dụ:**
```typescript
assert: [
    { type: "status_in", expected: [200, 201] },
    { type: "json_path_exists", path: "id" },
    { type: "custom", name: "balance_decreased", params: {...} }
]
```

## So sánh Response giữa các Steps

### Ví dụ: Balance Check Flow

```typescript
// Step 1: Get Balance Before
{
    id: "get_balance_before",
    extract: [{ var: "balanceBefore", from: "json", path: "balance" }]
}
// → ctx.vars.balanceBefore = 1000

// Step 2: Debit
{
    id: "debit",
    extract: [{ var: "debitAmount", from: "json", path: "amount" }],
    dependsOn: ["get_balance_before"]
}
// → ctx.vars.debitAmount = 100

// Step 3: Get Balance After
{
    id: "get_balance_after",
    extract: [{ var: "balanceAfter", from: "json", path: "balance" }],
    dependsOn: ["debit"],
    assert: [
        { 
            type: "custom", 
            name: "balance_decreased",
            params: {
                beforeVar: "balanceBefore",  // Từ step 1
                afterVar: "balanceAfter",   // Từ step 3
                amountVar: "debitAmount"    // Từ step 2
            }
        }
    ]
}
// → Check: balanceAfter = balanceBefore - debitAmount
```

**Cách hoạt động:**
1. Step 1 extract `balanceBefore` → lưu vào `ctx.vars.balanceBefore`
2. Step 2 extract `debitAmount` → lưu vào `ctx.vars.debitAmount`
3. Step 3 extract `balanceAfter` → lưu vào `ctx.vars.balanceAfter`
4. Assertion `balance_decreased` đọc từ `ctx.vars` và so sánh:
   ```typescript
   const before = ctx.vars.balanceBefore;  // 1000
   const after = ctx.vars.balanceAfter;    // 900
   const amount = ctx.vars.debitAmount;    // 100
   // Check: after === before - amount (900 === 1000 - 100)
   ```

## Cấu hình Response Fields

### Vị trí cấu hình

**File:** `src/hardcoded/providers.tsx`

Mỗi provider có thể config các field paths riêng trong `responseFields`:

```typescript
export const PROVIDERS: Record<string, ProviderDef> = {
    stripe: {
        // ... other configs
        responseFields: {
            balance: "balance",              // Field path cho balance
            errorMessage: "message",         // Field path cho error message
            errorCode: "err",                // Field path cho error code
            status: "status",                // Field path cho status
            transactionId: "id",             // Field path cho transaction ID
            amount: "amount"                 // Field path cho amount
        }
    },
    
    shope: {
        // ... other configs
        responseFields: {
            balance: "data.balance",         // Shope có balance trong data.balance
            errorMessage: "error.message",   // Shope có error message trong error.message
            errorCode: "error.code",         // Shope có error code trong error.code
            status: "data.status",
            transactionId: "data.id",
            amount: "data.amount"
        }
    }
};
```

### Cách sử dụng trong Test Cases

**1. Extract sử dụng field path trực tiếp:**
```typescript
extract: [
    { var: "balanceBefore", from: "json", path: "balance" }
    // Hoặc nếu Shope: path: "data.balance"
]
```

**2. Assertions sử dụng responseFields config:**
```typescript
// error_message assertion tự động dùng responseFields.errorMessage
assert: [
    { 
        type: "custom", 
        name: "error_message",
        params: { message: "invalid" }
        // Tự động dùng responseFields.errorMessage để tìm message
    }
]

// balance_decreased assertion hiển thị field path trong error message
// Nếu fail: "Balance not decreased correctly (field: balance): ..."
```

### Luồng sử dụng Response Fields Config

```
1. Provider được chọn
   ↓
2. Load providerDef từ PROVIDERS[provider]
   ↓
3. Lấy responseFields từ providerDef.responseFields
   ↓
4. Pass responseFields vào runTestCase()
   ↓
5. TestRunner sử dụng responseFields trong assertions:
   - error_message: dùng responseFields.errorMessage
   - balance_decreased: hiển thị responseFields.balance trong error
   - Có thể mở rộng cho các assertions khác
```

## Dependencies và Execution Order

### Topological Sort

Steps được sắp xếp theo dependencies:

```typescript
// Step có dependsOn sẽ chạy sau step được depend
{
    id: "step2",
    dependsOn: ["step1"]  // Chạy sau step1
}

// Nếu không có dependsOn, chạy theo thứ tự trong array
```

### Parallel Groups

Steps cùng `parallelGroup` sẽ chạy song song (sau khi dependencies thỏa mãn):

```typescript
{
    id: "step1",
    parallelGroup: "group1"
},
{
    id: "step2", 
    parallelGroup: "group1"  // Chạy song song với step1
}
```

## Ví dụ hoàn chỉnh

### Test Case: Balance → Debit → Balance Check

```typescript
{
    id: "balance_debit_balance_check",
    title: "Balance → Debit → Balance (Balance Must Decrease)",
    steps: [
        // Step 1: Get balance trước debit
        {
            id: "get_balance_before",
            method: "GET",
            url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
            extract: [
                { var: "balanceBefore", from: "json", path: "balance" }
                // path: "balance" hoặc "data.balance" tùy provider config
            ],
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "balance" }
            ]
        },
        
        // Step 2: Tạo debit
        {
            id: "debit",
            method: "POST",
            url: "{{context.url}}/debit",
            body: {
                playerId: "{{context.playerId}}",
                amount: "{{input.amount}}"
            },
            extract: [
                { var: "debitId", from: "json", path: "id" },
                { var: "debitAmount", from: "json", path: "amount" }
            ],
            dependsOn: ["get_balance_before"],  // Chạy sau step 1
            assert: [
                { type: "status_in", expected: [200, 201] }
            ]
        },
        
        // Step 3: Get balance sau debit và check
        {
            id: "get_balance_after",
            method: "GET",
            url: "{{context.url}}/getbalance?operatorId={{context.operatorId}}&playerId={{context.playerId}}",
            extract: [
                { var: "balanceAfter", from: "json", path: "balance" }
            ],
            dependsOn: ["debit"],  // Chạy sau step 2
            assert: [
                { type: "status_in", expected: [200] },
                { type: "json_path_exists", path: "balance" },
                {
                    type: "custom",
                    name: "balance_decreased",
                    params: {
                        beforeVar: "balanceBefore",  // Từ step 1
                        afterVar: "balanceAfter",    // Từ step 3
                        amountVar: "debitAmount"     // Từ step 2
                    }
                }
            ]
        }
    ]
}
```

**Execution Flow:**
1. Step 1 chạy → Extract `balanceBefore = 1000` → Lưu vào `ctx.vars.balanceBefore`
2. Step 2 chạy (sau step 1) → Extract `debitId`, `debitAmount = 100` → Lưu vào `ctx.vars`
3. Step 3 chạy (sau step 2) → Extract `balanceAfter = 900` → Lưu vào `ctx.vars.balanceAfter`
4. Assertion `balance_decreased` check:
   - `balanceAfter (900) === balanceBefore (1000) - debitAmount (100)` ✅

## Tóm tắt

1. **Template Variables**: `{{context.xxx}}`, `{{input.xxx}}`, `{{vars.xxx}}`
2. **Extract**: Lưu giá trị từ response vào `ctx.vars` để dùng cho steps sau
3. **Assertions**: Check response của step hiện tại, có thể so sánh với variables từ steps trước
4. **Response Fields Config**: Định nghĩa trong `providers.ts` → `responseFields` → Pass vào `runTestCase()` → Sử dụng trong assertions
5. **Dependencies**: `dependsOn` đảm bảo thứ tự thực thi
6. **Parallel Groups**: Steps cùng group chạy song song sau khi dependencies thỏa mãn

