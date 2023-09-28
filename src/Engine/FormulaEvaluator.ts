import Cell from "./Cell"
import SheetMemory from "./SheetMemory"
import { ErrorMessages } from "./GlobalDefinitions";



export class FormulaEvaluator {
  // Define a function called update that takes a string parameter and returns a number
  private _errorOccured: boolean = false;
  private _errorMessage: string = "";
  private _currentFormula: FormulaType = [];
  private _lastResult: number = 0;
  private _sheetMemory: SheetMemory;
  private _result: number = 0;


  constructor(memory: SheetMemory) {
    this._sheetMemory = memory;
  }

  /**
    * place holder for the evaluator.   I am not sure what the type of the formula is yet 
    * I do know that there will be a list of tokens so i will return the length of the array
    * 
    * I also need to test the error display in the front end so i will set the error message to
    * the error messages found In GlobalDefinitions.ts
    * 
    * according to this formula.
    * 
    7 tokens partial: "#ERR",
    8 tokens divideByZero: "#DIV/0!",
    9 tokens invalidCell: "#REF!",
  10 tokens invalidFormula: "#ERR",
  11 tokens invalidNumber: "#ERR",
  12 tokens invalidOperator: "#ERR",
  13 missingParentheses: "#ERR",
  0 tokens emptyFormula: "#EMPTY!",

                    When i get back from my quest to save the world from the evil thing i will fix.
                      (if you are in a hurry you can fix it yourself)
                               Sincerely 
                               Bilbo
    * 
   */

  evaluate(formula: FormulaType) {

    this._currentFormula = [...formula];
    this._lastResult = 0;

    // set the errorOccured flag
    this._errorOccured = false;

    // clear the error message
    this._errorMessage = "";

    switch (formula.length) {
      case 0:
        this._errorMessage = ErrorMessages.emptyFormula;
        break;
      case 7:
        this._errorMessage = ErrorMessages.partial;
        break;
      case 8:
        this._errorMessage = ErrorMessages.divideByZero;
        break;
      case 9:
        this._errorMessage = ErrorMessages.invalidCell;
        break;
      case 10:
        this._errorMessage = ErrorMessages.invalidFormula;
        break;
      case 11:
        this._errorMessage = ErrorMessages.invalidNumber;
        break;
      case 12:
        this._errorMessage = ErrorMessages.invalidOperator;
        break;
      case 13:
        this._errorMessage = ErrorMessages.missingParentheses;
        break;
      default:
        this._errorMessage = "";
        break;
    }

    // if the formula is empty set the result to 0
    if (this._errorMessage === ErrorMessages.emptyFormula) {
      this._result = 0;
      return;
    }

    let result = this.calculate();
    this._result = result;

    // if there is an error set the error message to invalid formula
    if (this._currentFormula.length > 0 && !this._errorOccured) {
      this._errorMessage = ErrorMessages.invalidFormula;
      this._errorOccured = true;
    }

    // if there was an error set the result to the last result
    if (this._errorOccured) {
      this._result = this._lastResult;
    }
  }

  public get error(): string {
    return this._errorMessage
  }

  public get result(): number {
    return this._result;
  }

  /**
   * 
   * @returns the value of the current expression
   */
  private calculate(): number {
    // if an error occured return the last result
    if (this._errorOccured) {
      return this._lastResult;
    }

    let result = this.term();
    while (this._currentFormula.length > 0 &&
      (this._currentFormula[0] === "+" || this._currentFormula[0] === "-")) {
      let operator = this._currentFormula.shift();
      let term = this.term();
      if (operator === "+") {
        result += term;
      } else if (operator === "-") {
        result -= term;
      }
    }

    // set the lastResult to the result
    this._lastResult = result;
    return result;
  }

  /**
   * 
   * @returns true if the current token is a supported operator
   */
  private supportedOperator(): boolean {
    switch (this._currentFormula[0]) {
      case "*":
      case "/":
      case "+/-":
        return true;
      default:
        return false;
    }
  }

  /**
   * 
   * @returns the value of the current term
   */
  private term(): number {
    if (this._errorOccured) {
      return this._lastResult;
    }
    let result = this.parse();
    while (this._currentFormula.length > 0 && this.supportedOperator()) {
      let operator = this._currentFormula.shift();

      if (this._errorOccured && operator === "+/-") {
        this._errorMessage = "";
        this._errorOccured = false;
      }

      // if the operator is +/-
      if (operator === "+/-") {
        if (result === 0) {
          result = 0;
        } else {
          result = result * -1;
        }
        continue;
      }

      let num = this.parse();
      if (operator === "*") {
        result *= num;
      } else if (operator === "/") {
        // check for divide by zero
        if (num === 0) {
          this._errorMessage = ErrorMessages.divideByZero;
          this._errorOccured = true;
          this._lastResult = Infinity;
          return Infinity;
        } else {
          result /= num;
        }
      }
    }
    // set the lastResult to the result
    this._lastResult = result;
    return result;
  }


  /**
   * 
   * @returns parse the current token and return the value
   */
  private parse(): number {
    if (this._errorOccured) {
      return this._lastResult;
    }
    let result = 0;

    // if the formula is empty set the errorOccured flag to true and set the errorMessage to "partial"
    if (this._currentFormula.length === 0) {
      this._errorMessage = ErrorMessages.partial;
      this._errorOccured = true;
      return result;
    }

    // get the current token
    let token = this._currentFormula.shift();

    // if the token is a number set the result to the number
    if (this.isNumber(token)) {
      result = Number(token);
      this._lastResult = result;

    } else if (token === "(") { // if the token is a "(" get the value of the expression in the parentheses
      result = this.calculate();
      if (this._currentFormula.length === 0 || this._currentFormula.shift() !== ")") {
        this._errorMessage = ErrorMessages.missingParentheses;
        this._errorOccured = true;
        this._lastResult = result;
      }
    } else if (this.isCellReference(token)) { // if the token is a cell reference get the value of the cell
      [result, this._errorMessage] = this.getCellValue(token);

      // if the cell has an error set the errorOccured flag to true and set the errorMessage to the error
      if (this._errorMessage !== "") {
        this._errorOccured = true;
        this._lastResult = result;
      }

    } else { // otherwise set the errorOccured flag to true and set the errorMessage to "invalidFormula"
      this._errorMessage = ErrorMessages.invalidFormula;
      this._errorOccured = true;
    }
    return result;
  }

  /**
   * 
   * @param token 
   * @returns true if the toke can be parsed to a number
   */
  isNumber(token: TokenType): boolean {
    return !isNaN(Number(token));
  }

  /**
   * 
   * @param token
   * @returns true if the token is a cell reference
   * 
   */
  isCellReference(token: TokenType): boolean {

    return Cell.isValidCellLabel(token);
  }

  /**
   * 
   * @param token
   * @returns [value, ""] if the cell formula is not empty and has no error
   * @returns [0, error] if the cell has an error
   * @returns [0, ErrorMessages.invalidCell] if the cell formula is empty
   * 
   */
  getCellValue(token: TokenType): [number, string] {

    let cell = this._sheetMemory.getCellByLabel(token);
    let formula = cell.getFormula();
    let error = cell.getError();

    // if the cell has an error return 0
    if (error !== "" && error !== ErrorMessages.emptyFormula) {
      return [0, error];
    }

    // if the cell formula is empty return 0
    if (formula.length === 0) {
      return [0, ErrorMessages.invalidCell];
    }


    let value = cell.getValue();
    return [value, ""];

  }


}

export default FormulaEvaluator;