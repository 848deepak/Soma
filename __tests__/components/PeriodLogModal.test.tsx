import { fireEvent, render, screen } from "@testing-library/react-native";

import { PeriodLogModal } from "@/src/components/ui/PeriodLogModal";

describe("PeriodLogModal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-26T08:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("defaults start date to today when opened", () => {
    render(
      <PeriodLogModal
        visible
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByDisplayValue("2026-03-26")).toBeTruthy();
  });

  it("allows manual override and submits entered values", () => {
    const onSubmit = jest.fn();

    render(
      <PeriodLogModal
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    fireEvent.changeText(
      screen.getByTestId("period-log-start-date-input"),
      "2026-03-20",
    );
    fireEvent.changeText(
      screen.getByTestId("period-log-end-date-input"),
      "2026-03-24",
    );
    fireEvent.press(screen.getByTestId("period-log-save-button"));

    expect(onSubmit).toHaveBeenCalledWith({
      startDate: "2026-03-20",
      endDate: "2026-03-24",
    });
  });

  it("supports quick date actions for start date", () => {
    render(
      <PeriodLogModal
        visible
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        isSubmitting={false}
      />,
    );

    fireEvent.press(screen.getByTestId("period-log-quick-week-ago"));
    expect(screen.getByDisplayValue("2026-03-19")).toBeTruthy();

    fireEvent.press(screen.getByTestId("period-log-quick-yesterday"));
    expect(screen.getByDisplayValue("2026-03-25")).toBeTruthy();

    fireEvent.press(screen.getByTestId("period-log-quick-today"));
    expect(screen.getByDisplayValue("2026-03-26")).toBeTruthy();
  });

  it("blocks submit when end date is before start date", () => {
    const onSubmit = jest.fn();

    render(
      <PeriodLogModal
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
        isSubmitting={false}
      />,
    );

    fireEvent.changeText(
      screen.getByTestId("period-log-start-date-input"),
      "2026-03-20",
    );
    fireEvent.changeText(
      screen.getByTestId("period-log-end-date-input"),
      "2026-03-10",
    );
    fireEvent.press(screen.getByTestId("period-log-save-button"));

    expect(screen.getByText("End date cannot be before start date.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
