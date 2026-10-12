import type { CoverPreset } from "../domain";

const presets: CoverPreset[] = ["c1", "c2", "c3", "c4", "c5", "c6"];

interface CoverPickerProps {
  value: CoverPreset;
  onChange: (value: CoverPreset) => void;
}

export function CoverPicker({ value, onChange }: CoverPickerProps) {
  return (
    <fieldset className="cover-picker">
      <legend>내 목표의 분위기를 골라 주세요</legend>
      <div className="cover-picker__grid">
        {presets.map((preset, index) => (
          <button
            type="button"
            className={`cover-choice cover-${preset}${value === preset ? " cover-choice--selected" : ""}`}
            key={preset}
            onClick={() => onChange(preset)}
            aria-pressed={value === preset}
            aria-label={`커버 ${index + 1}`}
          >
            <span aria-hidden="true">♣</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
