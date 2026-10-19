import type { NewCaseInput, ValidationErrors } from "./types";

/** Validate case creation form input. Returns an error map (empty = valid). */
export function validateNewCase(
  input: Partial<NewCaseInput>
): ValidationErrors<NewCaseInput> {
  const errors: ValidationErrors<NewCaseInput> = {};

  if (!input.title || input.title.trim().length === 0) {
    errors.title = "Case title is required.";
  } else if (input.title.trim().length > 120) {
    errors.title = "Case title must be 120 characters or fewer.";
  }

  if (!input.referenceNumber || input.referenceNumber.trim().length === 0) {
    errors.referenceNumber = "Reference number is required.";
  } else if (!/^[A-Za-z0-9\-_/]+$/.test(input.referenceNumber.trim())) {
    errors.referenceNumber =
      "Reference number may only contain letters, digits, hyphens, underscores, and slashes.";
  } else if (input.referenceNumber.trim().length > 40) {
    errors.referenceNumber = "Reference number must be 40 characters or fewer.";
  }

  if (input.description && input.description.trim().length > 1000) {
    errors.description = "Description must be 1000 characters or fewer.";
  }

  return errors;
}
