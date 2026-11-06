import { FinancialSettings } from '../types';

export interface CalculatedFinancialBreakdown {
  maintenanceAllocation: number;
  contentAllocation: number;
  operationalAllocation: number;
  afterStoreExpenses: number;
  netProfit: number;
  partner1Share: number;
  partner2Share: number;
}

export const calculateFinancialBreakdown = (
  grossRevenue: number,
  financialSettings: FinancialSettings,
  capitalAmount = 0
): CalculatedFinancialBreakdown => {
  const revenueAndCapital = grossRevenue + capitalAmount;
  const maintenanceAllocation =
    (financialSettings.maintenanceMode ?? 'percentage') === 'nominal'
      ? Number(financialSettings.maintenanceBudgetNominal ?? 0)
      : Math.round((grossRevenue * financialSettings.maintenanceBudgetPercentage) / 100);
  const contentAllocation =
    financialSettings.contentBudgetAmount !== undefined
      ? Number(financialSettings.contentBudgetAmount)
      : Math.round((grossRevenue * (financialSettings.contentBudgetPercentage || 0)) / 100);
  const operationalAllocation = Math.round(
    (revenueAndCapital * financialSettings.operationalBudgetPercentage) / 100
  );
  const afterStoreExpenses = revenueAndCapital - operationalAllocation;
  const netProfit = afterStoreExpenses - maintenanceAllocation - contentAllocation;
  const distributableProfit = Math.max(0, netProfit);
  const partner1Share = Math.round(
    (distributableProfit * financialSettings.partner1Percentage) / 100
  );

  return {
    maintenanceAllocation,
    contentAllocation,
    operationalAllocation,
    afterStoreExpenses,
    netProfit,
    partner1Share,
    partner2Share: distributableProfit - partner1Share,
  };
};
