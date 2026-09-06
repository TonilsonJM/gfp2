'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ChartPizza({
  labels,
  valores,
  cores,
}: {
  labels: string[];
  valores: number[];
  cores: string[];
}) {
  if (labels.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Sem dados suficientes para este gráfico.
      </div>
    );
  }

  const data = {
    labels,
    datasets: [
      {
        data: valores,
        backgroundColor: cores,
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="h-56">
      <Pie
        data={data}
        options={{
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
        }}
      />
    </div>
  );
}
