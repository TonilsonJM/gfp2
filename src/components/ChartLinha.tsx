'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function ChartLinha({
  labels,
  valores,
}: {
  labels: string[];
  valores: number[];
}) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Saldo acumulado (Kz)',
        data: valores,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  return (
    <div className="h-56">
      <Line
        data={data}
        options={{
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: (v) => `${v}` } },
          },
        }}
      />
    </div>
  );
}
