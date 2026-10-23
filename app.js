// HealthOS AI
// Demonstration only: fictional data, no real patient records.

const transactions = [
    {
        ref: "HOS-1001",
        service: "Laboratory test",
        detail: "Sample patient A",
        finding: "Service record has no matching charge",
        amount: 35000,
        status: "Review needed"
    },
    {
        ref: "HOS-1002",
        service: "Pharmacy dispense",
        detail: "Sample patient B",
        finding: "Dispense and invoice amounts differ",
        amount: 21500,
        status: "Review needed"
    },
    {
        ref: "HOS-1003",
        service: "Consultation",
        detail: "Sample patient C",
        finding: "Service and payment records match",
        amount: 15000,
        status: "Matched"
    },
    {
        ref: "HOS-1004",
        service: "Imaging service",
        detail: "Sample patient D",
        finding: "Payment reference needs confirmation",
        amount: 30000,
        status: "Review needed"
    },
    {
        ref: "HOS-1005",
        service: "Follow-up visit",
        detail: "Sample patient E",
        finding: "Service and payment records match",
        amount: 10000,
        status: "Matched"
    },
    {
        ref: "HOS-1006",
        service: "Basic laboratory panel",
        detail: "Sample patient F",
        finding: "Service and payment records match",
        amount: 12500,
        status: "Matched"
    }
];

const body = document.getElementById("transactionsBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

const naira = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
});

function renderTransactions() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const visibleTransactions = transactions.filter(function (item) {
        const searchableText = [
            item.ref,
            item.service,
            item.finding,
            item.status
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(query);

        const matchesStatus =
            selectedStatus === "all" ||
            item.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    body.replaceChildren();

    if (visibleTransactions.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No sample transactions match your search.";

        row.appendChild(cell);
        body.appendChild(row);
        return;
    }

    visibleTransactions.forEach(function (item) {
        const row = document.createElement("tr");

        const referenceCell = document.createElement("td");
        referenceCell.textContent = item.ref;

        const detail = document.createElement("div");
        detail.className = "stat-note";
        detail.textContent = item.detail;
        referenceCell.appendChild(detail);

        const serviceCell = document.createElement("td");
        serviceCell.textContent = item.service;

        const findingCell = document.createElement("td");
        findingCell.textContent = item.finding;

        const amountCell = document.createElement("td");
        amountCell.textContent = naira.format(item.amount);

        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className =
            "pill " + (item.status === "Matched" ? "matched" : "review");

        statusBadge.textContent = item.status;
        statusCell.appendChild(statusBadge);

        row.append(
            referenceCell,
            serviceCell,
            findingCell,
            amountCell,
            statusCell
        );

        body.appendChild(row);
    });
}

searchInput.addEventListener("input", renderTransactions);
statusFilter.addEventListener("change", renderTransactions);

renderTransactions();
