declare module "jspdf" {
  const jsPDF: any;
  export default jsPDF;
}

declare module "jspdf-autotable" {
  // plugin augments jsPDF prototype; no exports required
  const content: any;
  export default content;
}
