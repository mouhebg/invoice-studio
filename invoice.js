(() => {
  "use strict";

  const DRAFT_KEY = "mos-invoice-studio-draft-v1";
  const ARCHIVE_KEY = "mos-invoice-studio-archive-v1";
  const MAX_LOGO_BYTES = 500 * 1024;

  const $ = (id) => document.getElementById(id);
  const form = $("invoiceForm");
  const itemsEditor = $("itemsEditor");
  const itemTemplate = $("itemTemplate");
  const archiveDialog = $("archiveDialog");
  const editorPanel = $("editorPanel");
  const previewPanel = $("previewPanel");

  let state = createFreshState();
  let autosaveTimer;
  let toastTimer;

  function isoDate(date) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function createInvoiceNumber(sourceArchive = readArchive()) {
    const year = new Date().getFullYear();
    const yearNumbers = sourceArchive
      .map((entry) => entry.data?.invoice?.number || "")
      .map((number) => number.match(new RegExp(`^INV-${year}-(\\d+)$`)))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    const next = Math.max(0, ...yearNumbers) + 1;
    return `INV-${year}-${String(next).padStart(3, "0")}`;
  }

  function createFreshState() {
    const today = new Date();
    return {
      version: 1,
      business: {
        name: "",
        contact: "",
        email: "",
        phone: "",
        taxNumber: "",
        address: "",
        logo: "",
        accent: "cobalt"
      },
      client: {
        name: "",
        contact: "",
        email: "",
        address: "",
        purchaseOrder: ""
      },
      invoice: {
        number: createInvoiceNumber(),
        currency: "CAD",
        issueDate: isoDate(today),
        dueDate: isoDate(addDays(today, 30)),
        discount: 0,
        amountPaid: 0,
        status: "draft",
        taxEnabled: false,
        taxLabel: "HST",
        taxRate: 13,
        paymentInstructions: "",
        paymentLink: "",
        notes: "",
        recurringEnabled: false,
        recurringCadence: "monthly",
        nextInvoiceDate: isoDate(addDays(today, 30))
      },
      items: [
        {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          description: "",
          quantity: 1,
          rate: 0
        }
      ]
    };
  }

  function safeNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function money(value, currency = state.invoice.currency) {
    try {
      return new Intl.NumberFormat("en-CA", {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "TND" ? 3 : 2,
        maximumFractionDigits: currency === "TND" ? 3 : 2
      }).format(value || 0);
    } catch {
      return `${currency} ${(value || 0).toFixed(2)}`;
    }
  }

  function prettyDate(value) {
    if (!value) return "Not set";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function readArchive() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeArchive(archive) {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (draft?.invoice && Array.isArray(draft.items)) {
        state = mergeState(draft);
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }

  function mergeState(incoming) {
    const fresh = createFreshState();
    return {
      ...fresh,
      ...incoming,
      business: { ...fresh.business, ...(incoming.business || {}) },
      client: { ...fresh.client, ...(incoming.client || {}) },
      invoice: { ...fresh.invoice, ...(incoming.invoice || {}) },
      items: Array.isArray(incoming.items) && incoming.items.length
        ? incoming.items.map((item) => ({
            id: item.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
            description: item.description || "",
            quantity: safeNumber(item.quantity),
            rate: safeNumber(item.rate)
          }))
        : fresh.items
    };
  }

  function setValue(id, value) {
    const element = $(id);
    if (!element) return;
    if (element.type === "checkbox") element.checked = Boolean(value);
    else element.value = value ?? "";
  }

  function populateForm() {
    setValue("businessName", state.business.name);
    setValue("businessContact", state.business.contact);
    setValue("businessEmail", state.business.email);
    setValue("businessPhone", state.business.phone);
    setValue("businessTaxNumber", state.business.taxNumber);
    setValue("businessAddress", state.business.address);
    setValue("invoiceAccent", state.business.accent);
    setValue("clientName", state.client.name);
    setValue("clientContact", state.client.contact);
    setValue("clientEmail", state.client.email);
    setValue("clientAddress", state.client.address);
    setValue("purchaseOrder", state.client.purchaseOrder);
    setValue("invoiceNumber", state.invoice.number);
    setValue("currency", state.invoice.currency);
    setValue("invoiceStatus", state.invoice.status);
    setValue("issueDate", state.invoice.issueDate);
    setValue("dueDate", state.invoice.dueDate);
    setValue("discount", state.invoice.discount);
    setValue("amountPaid", state.invoice.amountPaid);
    setValue("taxEnabled", state.invoice.taxEnabled);
    setValue("taxLabel", state.invoice.taxLabel);
    setValue("taxRate", state.invoice.taxRate);
    setValue("paymentInstructions", state.invoice.paymentInstructions);
    setValue("paymentLink", state.invoice.paymentLink);
    setValue("invoiceNotes", state.invoice.notes);
    setValue("recurringEnabled", state.invoice.recurringEnabled);
    setValue("recurringCadence", state.invoice.recurringCadence);
    setValue("nextInvoiceDate", state.invoice.nextInvoiceDate);
    $("taxSettings").hidden = !state.invoice.taxEnabled;
    $("recurringSettings").hidden = !state.invoice.recurringEnabled;
    renderItemEditors();
  }

  function readFormIntoState() {
    state.business.name = $("businessName").value.trim();
    state.business.contact = $("businessContact").value.trim();
    state.business.email = $("businessEmail").value.trim();
    state.business.phone = $("businessPhone").value.trim();
    state.business.taxNumber = $("businessTaxNumber").value.trim();
    state.business.address = $("businessAddress").value.trim();
    state.business.accent = $("invoiceAccent").value;
    state.client.name = $("clientName").value.trim();
    state.client.contact = $("clientContact").value.trim();
    state.client.email = $("clientEmail").value.trim();
    state.client.address = $("clientAddress").value.trim();
    state.client.purchaseOrder = $("purchaseOrder").value.trim();
    state.invoice.number = $("invoiceNumber").value.trim();
    state.invoice.currency = $("currency").value;
    state.invoice.status = $("invoiceStatus").value;
    state.invoice.issueDate = $("issueDate").value;
    state.invoice.dueDate = $("dueDate").value;
    state.invoice.discount = safeNumber($("discount").value);
    state.invoice.amountPaid = safeNumber($("amountPaid").value);
    state.invoice.taxEnabled = $("taxEnabled").checked;
    state.invoice.taxLabel = $("taxLabel").value.trim() || "Tax";
    state.invoice.taxRate = safeNumber($("taxRate").value);
    state.invoice.paymentInstructions = $("paymentInstructions").value.trim();
    state.invoice.paymentLink = $("paymentLink").value.trim();
    state.invoice.notes = $("invoiceNotes").value.trim();
    state.invoice.recurringEnabled = $("recurringEnabled").checked;
    state.invoice.recurringCadence = $("recurringCadence").value;
    state.invoice.nextInvoiceDate = $("nextInvoiceDate").value;
  }

  function createItemEditor(item, index) {
    const fragment = itemTemplate.content.cloneNode(true);
    const fieldset = fragment.querySelector(".item-editor");
    fieldset.dataset.itemId = item.id;
    fieldset.querySelector("legend").textContent = `Invoice item ${index + 1}`;

    const description = fieldset.querySelector('[data-field="description"]');
    const quantity = fieldset.querySelector('[data-field="quantity"]');
    const rate = fieldset.querySelector('[data-field="rate"]');
    const total = fieldset.querySelector("[data-item-total]");
    const remove = fieldset.querySelector("[data-remove-item]");

    description.value = item.description;
    quantity.value = item.quantity;
    rate.value = item.rate;
    total.textContent = money(item.quantity * item.rate);
    remove.hidden = state.items.length === 1;

    fieldset.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      if (!field) return;
      const target = state.items.find((entry) => entry.id === item.id);
      if (!target) return;
      target[field] = field === "description" ? event.target.value : safeNumber(event.target.value);
      total.textContent = money(target.quantity * target.rate);
      update();
    });

    remove.addEventListener("click", () => {
      if (state.items.length === 1) return;
      state.items = state.items.filter((entry) => entry.id !== item.id);
      renderItemEditors();
      update();
    });

    return fragment;
  }

  function renderItemEditors() {
    itemsEditor.innerHTML = "";
    state.items.forEach((item, index) => {
      itemsEditor.appendChild(createItemEditor(item, index));
    });
  }

  function totals() {
    const subtotal = state.items.reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.rate), 0);
    const discount = Math.min(safeNumber(state.invoice.discount), subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = state.invoice.taxEnabled ? taxable * safeNumber(state.invoice.taxRate) / 100 : 0;
    const total = taxable + tax;
    const paid = state.invoice.status === "paid"
      ? total
      : Math.min(safeNumber(state.invoice.amountPaid), total);
    const balance = Math.max(0, total - paid);
    return { subtotal, discount, taxable, tax, total, paid, balance };
  }

  function effectiveStatus(invoiceState, balance) {
    if (invoiceState.status === "paid" || (balance === 0 && invoiceState.status !== "draft")) return "paid";
    if (invoiceState.status === "draft") return "draft";
    const today = isoDate(new Date());
    if (invoiceState.dueDate && invoiceState.dueDate < today && balance > 0) return "overdue";
    return "sent";
  }

  function lines(...values) {
    return values.filter((value) => String(value || "").trim()).join("\n");
  }

  function setText(id, value) {
    $(id).textContent = value;
  }

  function toggle(id, show) {
    $(id).hidden = !show;
  }

  function renderPreview() {
    const result = totals();
    const status = effectiveStatus(state.invoice, result.balance);
    const accentValues = {
      cobalt: "#2b47ff",
      ink: "#10182b",
      green: "#0b6646",
      coral: "#d63f59"
    };
    const businessName = state.business.name || "Your business name";
    const clientName = state.client.name || "Add your client's details.";
    const contactLine = [state.business.contact, state.business.email].filter(Boolean).join(" | ");
    const businessDetails = lines(
      state.business.name,
      state.business.contact,
      state.business.address,
      state.business.email,
      state.business.phone,
      state.business.taxNumber ? `Registration: ${state.business.taxNumber}` : ""
    );
    const clientDetails = state.client.name
      ? lines(state.client.name, state.client.contact, state.client.address, state.client.email)
      : clientName;

    setText("headerTotal", money(result.balance));
    setText("headerInvoiceNumber", state.invoice.number || "Invoice number");
    setText("previewBusinessName", businessName);
    setText("previewBusinessContact", contactLine);
    setText("previewInvoiceNumber", state.invoice.number || "Not set");
    setText("previewIssueDate", prettyDate(state.invoice.issueDate));
    setText("previewDueDate", prettyDate(state.invoice.dueDate));
    setText("previewCurrency", state.invoice.currency);
    setText("previewSignalTotal", money(result.balance));
    setText("previewFrom", businessDetails || "Add your business details.");
    setText("previewBillTo", clientDetails);
    setText("previewSubtotal", money(result.subtotal));
    setText("previewDiscount", `−${money(result.discount)}`);
    setText("previewTaxLabel", `${state.invoice.taxLabel || "Tax"} (${safeNumber(state.invoice.taxRate)}%)`);
    setText("previewTax", money(result.tax));
    setText("previewPaid", `−${money(result.paid)}`);
    setText("previewBalance", money(result.balance));
    setText("previewPayment", state.invoice.paymentInstructions);
    setText("previewNotes", state.invoice.notes);
    setText("previewFooterBusiness", businessName);
    setText("previewFooterContact", lines(state.business.email, state.business.phone));
    setText("discountCurrency", state.invoice.currency);
    setText("paidCurrency", state.invoice.currency);

    const statusLabels = {
      draft: "Draft",
      sent: "Payment due",
      overdue: "Overdue",
      paid: "Paid in full"
    };
    setText("previewStatus", statusLabels[status]);
    $("invoicePaper").style.setProperty("--invoice-accent", accentValues[state.business.accent] || accentValues.cobalt);

    toggle("previewDiscountRow", result.discount > 0);
    toggle("previewTaxRow", state.invoice.taxEnabled);
    toggle("previewPaidRow", result.paid > 0);
    toggle("previewPaymentWrap", Boolean(state.invoice.paymentInstructions || /^https?:\/\//i.test(state.invoice.paymentLink)));
    toggle("previewNotesWrap", Boolean(state.invoice.notes));
    toggle("previewPO", Boolean(state.client.purchaseOrder));
    if (state.client.purchaseOrder) setText("previewPO", `PO: ${state.client.purchaseOrder}`);

    const paymentLink = $("previewPaymentLink");
    const paymentLinkIsValid = /^https?:\/\//i.test(state.invoice.paymentLink);
    paymentLink.hidden = !paymentLinkIsValid;
    if (paymentLinkIsValid) paymentLink.href = state.invoice.paymentLink;
    else paymentLink.removeAttribute("href");

    const logoWrap = $("previewLogoWrap");
    const logo = $("previewLogo");
    logoWrap.hidden = !state.business.logo;
    if (state.business.logo) {
      logo.src = state.business.logo;
      logo.alt = `${businessName} logo`;
    } else {
      logo.removeAttribute("src");
      logo.alt = "";
    }

    const previewItems = $("previewItems");
    previewItems.innerHTML = "";
    state.items.forEach((item) => {
      const row = document.createElement("tr");
      const description = document.createElement("td");
      const quantity = document.createElement("td");
      const rate = document.createElement("td");
      const amount = document.createElement("td");

      description.textContent = item.description.trim() || "Service or item";
      quantity.textContent = String(item.quantity || 0);
      rate.textContent = money(item.rate);
      amount.textContent = money(item.quantity * item.rate);
      quantity.dataset.label = "Quantity";
      rate.dataset.label = "Rate";
      amount.dataset.label = "Amount";
      row.append(description, quantity, rate, amount);
      previewItems.appendChild(row);
    });
  }

  function scheduleDraftSave() {
    clearTimeout(autosaveTimer);
    setText("autosaveStatus", "Saving draft");
    autosaveTimer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
        setText("autosaveStatus", "Draft saved");
      } catch {
        setText("autosaveStatus", "Draft not saved");
      }
    }, 350);
  }

  function update() {
    readFormIntoState();
    $("taxSettings").hidden = !state.invoice.taxEnabled;
    $("recurringSettings").hidden = !state.invoice.recurringEnabled;
    renderPreview();
    updateDashboard();
    scheduleDraftSave();
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function invoiceTitle(entryState = state) {
    return entryState.client.name || entryState.invoice.number || "Untitled invoice";
  }

  function saveCurrentInvoice() {
    readFormIntoState();
    if (!state.invoice.number) {
      $("invoiceNumber").focus();
      showToast("Add an invoice number before saving.");
      return;
    }

    const archive = readArchive();
    const existingIndex = archive.findIndex((entry) => entry.data?.invoice?.number === state.invoice.number);
    const entry = {
      id: existingIndex >= 0 ? archive[existingIndex].id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      savedAt: new Date().toISOString(),
      data: clone(state)
    };

    if (existingIndex >= 0) archive.splice(existingIndex, 1);
    archive.unshift(entry);
    try {
      writeArchive(archive);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      updateSavedCount();
      showToast(`Saved ${state.invoice.number}.`);
    } catch {
      showToast("This invoice could not be saved in the browser.");
    }
  }

  function renderArchive() {
    const archive = readArchive();
    const list = $("archiveList");
    list.innerHTML = "";
    if (!archive.length) {
      const empty = document.createElement("p");
      empty.className = "archive-empty";
      empty.textContent = "No saved invoices yet. Save the current invoice to add it here.";
      list.appendChild(empty);
      return;
    }

    archive.forEach((entry) => {
      const article = document.createElement("article");
      article.className = "archive-entry";
      const copy = document.createElement("div");
      const title = document.createElement("h3");
      const meta = document.createElement("p");
      const actions = document.createElement("div");
      const loadButton = document.createElement("button");
      const duplicateButton = document.createElement("button");
      const emailButton = document.createElement("button");
      const deleteButton = document.createElement("button");
      const entryTotals = calculateEntryTotals(entry.data);
      const entryStatusLabels = {
        draft: "Draft",
        sent: "Sent",
        overdue: "Overdue",
        paid: "Paid"
      };

      title.textContent = invoiceTitle(entry.data);
      meta.textContent = `${entry.data.invoice.number} | ${entryStatusLabels[entryTotals.status]} | ${money(entryTotals.balance, entry.data.invoice.currency)} due | saved ${prettyDate(entry.savedAt.slice(0, 10))}`;
      actions.className = "archive-entry__actions";
      loadButton.type = "button";
      loadButton.dataset.load = entry.id;
      loadButton.textContent = "Open";
      duplicateButton.type = "button";
      duplicateButton.dataset.duplicate = entry.id;
      duplicateButton.textContent = "Duplicate";
      emailButton.type = "button";
      emailButton.dataset.email = entry.id;
      emailButton.textContent = "Email";
      deleteButton.type = "button";
      deleteButton.dataset.delete = entry.id;
      deleteButton.textContent = "Delete";

      actions.append(loadButton, duplicateButton, emailButton, deleteButton);
      copy.append(title, meta);
      article.append(copy, actions);
      list.appendChild(article);
    });
  }

  function calculateEntryTotals(entryState) {
    const subtotal = (entryState.items || []).reduce((sum, item) => sum + safeNumber(item.quantity) * safeNumber(item.rate), 0);
    const discount = Math.min(safeNumber(entryState.invoice.discount), subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = entryState.invoice.taxEnabled ? taxable * safeNumber(entryState.invoice.taxRate) / 100 : 0;
    const total = taxable + tax;
    const paid = entryState.invoice.status === "paid"
      ? total
      : Math.min(safeNumber(entryState.invoice.amountPaid), total);
    const balance = Math.max(0, total - paid);
    return {
      total,
      paid,
      balance,
      status: effectiveStatus(entryState.invoice, balance)
    };
  }

  function loadInvoice(id) {
    const entry = readArchive().find((candidate) => candidate.id === id);
    if (!entry) return;
    state = mergeState(entry.data);
    populateForm();
    renderPreview();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    archiveDialog.close();
    showToast(`Opened ${state.invoice.number}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteInvoice(id) {
    const archive = readArchive();
    const entry = archive.find((candidate) => candidate.id === id);
    if (!entry) return;
    const confirmed = window.confirm(`Delete saved invoice ${entry.data.invoice.number}? This cannot be undone.`);
    if (!confirmed) return;
    writeArchive(archive.filter((candidate) => candidate.id !== id));
    updateSavedCount();
    renderArchive();
    showToast(`Deleted ${entry.data.invoice.number}.`);
  }

  function duplicateInvoice(id) {
    const entry = readArchive().find((candidate) => candidate.id === id);
    if (!entry) return;
    const today = new Date();
    state = mergeState(entry.data);
    state.invoice.number = createInvoiceNumber();
    state.invoice.issueDate = isoDate(today);
    state.invoice.dueDate = isoDate(addDays(today, 30));
    state.invoice.status = "draft";
    state.invoice.amountPaid = 0;
    state.invoice.nextInvoiceDate = nextRecurringDate(today, state.invoice.recurringCadence);
    populateForm();
    renderPreview();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    archiveDialog.close();
    showToast(`Created draft ${state.invoice.number}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function nextRecurringDate(fromDate, cadence) {
    const next = new Date(fromDate);
    if (cadence === "weekly") next.setDate(next.getDate() + 7);
    else if (cadence === "biweekly") next.setDate(next.getDate() + 14);
    else if (cadence === "quarterly") next.setMonth(next.getMonth() + 3);
    else next.setMonth(next.getMonth() + 1);
    return isoDate(next);
  }

  function prepareRecurringDrafts() {
    const archive = readArchive();
    const today = isoDate(new Date());
    let created = 0;

    archive.slice().forEach((template) => {
      const invoice = template.data?.invoice;
      if (!invoice?.recurringEnabled || !invoice.nextInvoiceDate) return;
      let nextDate = invoice.nextInvoiceDate;
      let safety = 0;
      const originalIssue = new Date(`${invoice.issueDate || nextDate}T12:00:00`);
      const originalDue = new Date(`${invoice.dueDate || nextDate}T12:00:00`);
      const dueDays = Math.max(0, Math.round((originalDue - originalIssue) / 86400000)) || 30;

      while (nextDate <= today && safety < 12) {
        const scheduledDate = new Date(`${nextDate}T12:00:00`);
        const draft = mergeState(template.data);
        draft.invoice.number = createInvoiceNumber(archive);
        draft.invoice.issueDate = nextDate;
        draft.invoice.dueDate = isoDate(addDays(scheduledDate, dueDays));
        draft.invoice.status = "draft";
        draft.invoice.amountPaid = 0;
        draft.invoice.recurringEnabled = false;
        draft.invoice.nextInvoiceDate = "";
        archive.unshift({
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
          savedAt: new Date().toISOString(),
          data: draft
        });
        created += 1;
        safety += 1;
        nextDate = nextRecurringDate(scheduledDate, invoice.recurringCadence);
      }

      template.data.invoice.nextInvoiceDate = nextDate;
      template.savedAt = new Date().toISOString();
    });

    if (created) {
      writeArchive(archive);
      showToast(`${created} recurring ${created === 1 ? "draft is" : "drafts are"} ready.`);
    }
  }

  function emailState(invoiceState) {
    const entryState = mergeState(invoiceState);
    const entryResult = calculateEntryTotals(entryState);
    const recipient = entryState.client.email || "";
    const subject = `Invoice ${entryState.invoice.number} from ${entryState.business.name || entryState.business.contact || "your service provider"}`;
    const paymentLine = entryState.invoice.paymentLink ? `\nPay online: ${entryState.invoice.paymentLink}\n` : "";
    const body = [
      `Hello${entryState.client.contact ? ` ${entryState.client.contact}` : ""},`,
      "",
      `Please find invoice ${entryState.invoice.number} for ${money(entryResult.balance, entryState.invoice.currency)}.`,
      `The payment due date is ${prettyDate(entryState.invoice.dueDate)}.`,
      paymentLine,
      "Please attach the PDF invoice to this email before sending.",
      "",
      `Thank you,\n${entryState.business.contact || entryState.business.name || ""}`
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function emailCurrentInvoice() {
    readFormIntoState();
    if (!state.client.email) showToast("Add the client's email address. Your email app will still open.");
    emailState(state);
  }

  function exportArchive() {
    const payload = {
      product: "Mo's Plans Invoice Studio",
      version: 1,
      exportedAt: new Date().toISOString(),
      invoices: readArchive()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mos-invoice-backup-${isoDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Invoice backup downloaded.");
  }

  async function importArchive(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Choose a backup file smaller than 5 MB.");
      return;
    }

    try {
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed.invoices;
      if (!Array.isArray(incoming) || incoming.some((entry) => !entry?.data?.invoice || !Array.isArray(entry.data.items))) {
        throw new Error("Invalid backup");
      }
      const confirmed = window.confirm(`Import ${incoming.length} saved invoices? Matching invoice numbers will be replaced.`);
      if (!confirmed) return;

      const merged = readArchive();
      incoming.forEach((entry) => {
        const normalized = {
          id: entry.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
          savedAt: entry.savedAt || new Date().toISOString(),
          data: mergeState(entry.data)
        };
        const existingIndex = merged.findIndex((candidate) => candidate.data?.invoice?.number === normalized.data.invoice.number);
        if (existingIndex >= 0) merged.splice(existingIndex, 1);
        merged.push(normalized);
      });
      merged.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
      writeArchive(merged);
      updateSavedCount();
      renderArchive();
      showToast(`Imported ${incoming.length} ${incoming.length === 1 ? "invoice" : "invoices"}.`);
    } catch {
      showToast("That file is not a valid invoice backup.");
    } finally {
      $("importArchive").value = "";
    }
  }

  function updateSavedCount() {
    const count = readArchive().length;
    setText("savedCount", String(count));
    updateDashboard();
  }

  function updateDashboard() {
    const archive = readArchive();
    const currency = state.invoice.currency;
    const matching = archive.filter((entry) => entry.data?.invoice?.currency === currency);
    let outstanding = 0;
    let overdue = 0;
    let paid = 0;
    let outstandingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    matching.forEach((entry) => {
      const result = calculateEntryTotals(entry.data);
      if (result.status === "sent" || result.status === "overdue") {
        outstanding += result.balance;
        outstandingCount += 1;
      }
      if (result.status === "overdue") {
        overdue += result.balance;
        overdueCount += 1;
      }
      if (result.status === "paid") {
        paid += result.total;
        paidCount += 1;
      }
    });

    setText("metricSaved", String(archive.length));
    setText("metricOutstanding", money(outstanding, currency));
    setText("metricOverdue", money(overdue, currency));
    setText("metricPaid", money(paid, currency));
    setText("metricOutstandingCount", `${outstandingCount} ${outstandingCount === 1 ? "invoice" : "invoices"} in ${currency}`);
    setText("metricOverdueCount", `${overdueCount} ${overdueCount === 1 ? "invoice" : "invoices"} in ${currency}`);
    setText("metricPaidCount", `${paidCount} ${paidCount === 1 ? "invoice" : "invoices"} in ${currency}`);
  }

  function makeNewInvoice() {
    const confirmed = window.confirm("Start a new invoice? Your current draft will be replaced. Save it first if you want to keep a copy.");
    if (!confirmed) return;
    const business = clone(state.business);
    state = createFreshState();
    state.business = business;
    populateForm();
    renderPreview();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    showToast("New invoice ready.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function activateTab(tab) {
    const showPreview = tab === "preview";
    $("editorTab").setAttribute("aria-selected", String(!showPreview));
    $("previewTab").setAttribute("aria-selected", String(showPreview));
    editorPanel.hidden = showPreview;
    previewPanel.hidden = !showPreview;
    if (showPreview) renderPreview();
  }

  function handleLogo(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showToast("Choose a PNG, JPG, or WebP logo.");
      $("businessLogo").value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      showToast("The logo must be 500 KB or smaller.");
      $("businessLogo").value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.business.logo = String(reader.result || "");
      renderPreview();
      scheduleDraftSave();
      showToast("Logo added.");
    });
    reader.addEventListener("error", () => showToast("The logo could not be read."));
    reader.readAsDataURL(file);
  }

  function printInvoice() {
    readFormIntoState();
    renderPreview();
    const previousTitle = document.title;
    const safeNumberForTitle = (state.invoice.number || "invoice").replace(/[^\w.-]+/g, "-");
    document.title = `${safeNumberForTitle}-${state.client.name || "client"}`;
    window.print();
    setTimeout(() => {
      document.title = previousTitle;
    }, 500);
  }

  form.addEventListener("input", (event) => {
    if (event.target.id === "businessLogo") return;
    update();
  });
  form.addEventListener("change", (event) => {
    if (event.target.id === "businessLogo") handleLogo(event.target.files?.[0]);
    else update();
  });

  $("addItem").addEventListener("click", () => {
    state.items.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
      description: "",
      quantity: 1,
      rate: 0
    });
    renderItemEditors();
    update();
    const last = itemsEditor.lastElementChild;
    last?.querySelector('[data-field="description"]')?.focus();
  });

  $("saveInvoice").addEventListener("click", saveCurrentInvoice);
  $("newInvoice").addEventListener("click", makeNewInvoice);
  $("emailInvoice").addEventListener("click", emailCurrentInvoice);
  $("printInvoice").addEventListener("click", printInvoice);
  $("printInvoiceSecondary").addEventListener("click", printInvoice);
  $("openArchive").addEventListener("click", () => {
    renderArchive();
    archiveDialog.showModal();
    document.body.style.overflow = "hidden";
  });
  $("closeArchive").addEventListener("click", () => archiveDialog.close());
  archiveDialog.addEventListener("close", () => {
    document.body.style.overflow = "";
  });
  archiveDialog.addEventListener("click", (event) => {
    if (event.target === archiveDialog) archiveDialog.close();
  });
  $("archiveList").addEventListener("click", (event) => {
    const loadButton = event.target.closest("[data-load]");
    const duplicateButton = event.target.closest("[data-duplicate]");
    const emailButton = event.target.closest("[data-email]");
    const deleteButton = event.target.closest("[data-delete]");
    if (loadButton) loadInvoice(loadButton.dataset.load);
    if (duplicateButton) duplicateInvoice(duplicateButton.dataset.duplicate);
    if (emailButton) {
      const entry = readArchive().find((candidate) => candidate.id === emailButton.dataset.email);
      if (entry) emailState(entry.data);
    }
    if (deleteButton) deleteInvoice(deleteButton.dataset.delete);
  });
  $("exportArchive").addEventListener("click", exportArchive);
  $("importArchive").addEventListener("change", (event) => importArchive(event.target.files?.[0]));
  $("editorTab").addEventListener("click", () => activateTab("editor"));
  $("previewTab").addEventListener("click", () => activateTab("preview"));

  const desktopQuery = window.matchMedia("(min-width: 981px)");
  function syncPanels(event) {
    if (event.matches) {
      editorPanel.hidden = false;
      previewPanel.hidden = false;
    } else {
      const previewSelected = $("previewTab").getAttribute("aria-selected") === "true";
      editorPanel.hidden = previewSelected;
      previewPanel.hidden = !previewSelected;
    }
  }
  desktopQuery.addEventListener?.("change", syncPanels);

  restoreDraft();
  prepareRecurringDrafts();
  if (readArchive().some((entry) => entry.data?.invoice?.number === state.invoice.number) && !localStorage.getItem(DRAFT_KEY)) {
    state.invoice.number = createInvoiceNumber();
  }
  populateForm();
  renderPreview();
  updateSavedCount();
  syncPanels(desktopQuery);
})();
