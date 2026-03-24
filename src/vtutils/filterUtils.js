export function matchFilter(cellValue, { op, value }) {
    const raw = cellValue ?? "";

    const num = Number(raw);
    const fnum = Number(value);

    const bothNumeric =
        !isNaN(num) && !isNaN(fnum) && String(raw).trim() !== "";

    if (bothNumeric && [">", "<", ">=", "<="].includes(op)) {
        switch (op) {
            case ">": return num > fnum;
            case "<": return num < fnum;
            case ">=": return num >= fnum;
            case "<=": return num <= fnum;
        }
    }

    const val = String(raw).toLowerCase();
    const fval = String(value).toLowerCase();

    switch (op) {
        case "=":
        case "equals":
            return bothNumeric ? num === fnum : val === fval;

        case "!=":
            return bothNumeric ? num !== fnum : val !== fval;

        case "contains":
            return val.includes(fval);

        case "starts":
            return val.startsWith(fval);

        case "ends":
            return val.endsWith(fval);

        case "in":
            return Array.isArray(value) && value.includes(raw);

        default:
            return true;
    }
}