import { useEffect } from 'react';

export const useSpanishValidation = () => {
  useEffect(() => {
    // Override default browser validation messages
    const originalCheckValidity = HTMLFormElement.prototype.checkValidity;
    const originalReportValidity = HTMLFormElement.prototype.reportValidity;

    // Override form validation
    HTMLFormElement.prototype.checkValidity = function() {
      const inputs = this.querySelectorAll('input[required], textarea[required], select[required]');
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        if (htmlInput.validity.valueMissing) {
          htmlInput.setCustomValidity('Por favor completa este campo');
        } else if (htmlInput.validity.typeMismatch) {
          htmlInput.setCustomValidity('Por favor ingresa un valor válido');
        } else if (htmlInput.validity.patternMismatch) {
          htmlInput.setCustomValidity('El formato no es válido');
        } else {
          htmlInput.setCustomValidity('');
        }
      });
      return originalCheckValidity.call(this);
    };

    HTMLFormElement.prototype.reportValidity = function() {
      const inputs = this.querySelectorAll('input[required], textarea[required], select[required]');
      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        if (htmlInput.validity.valueMissing) {
          htmlInput.setCustomValidity('Por favor completa este campo');
        } else if (htmlInput.validity.typeMismatch) {
          htmlInput.setCustomValidity('Por favor ingresa un valor válido');
        } else if (htmlInput.validity.patternMismatch) {
          htmlInput.setCustomValidity('El formato no es válido');
        } else {
          htmlInput.setCustomValidity('');
        }
      });
      return originalReportValidity.call(this);
    };

    // Set up global event listener for all inputs
    const handleInvalid = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.validity.valueMissing) {
        input.setCustomValidity('Por favor completa este campo');
      } else if (input.validity.typeMismatch) {
        input.setCustomValidity('Por favor ingresa un valor válido');
      } else if (input.validity.patternMismatch) {
        input.setCustomValidity('El formato no es válido');
      }
    };

    const handleInput = (e: Event) => {
      const input = e.target as HTMLInputElement;
      input.setCustomValidity('');
    };

    document.addEventListener('invalid', handleInvalid, true);
    document.addEventListener('input', handleInput, true);

    // Cleanup
    return () => {
      HTMLFormElement.prototype.checkValidity = originalCheckValidity;
      HTMLFormElement.prototype.reportValidity = originalReportValidity;
      document.removeEventListener('invalid', handleInvalid, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, []);
}; 