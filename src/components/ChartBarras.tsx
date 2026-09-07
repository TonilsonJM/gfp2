'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function ChartBarras({
  labels,
  receitas,
  despesas,
  labelSerie1 = 'Receitas',
  labelSerie2 = 'Despesas',
  corSerie1 = '#10B981',
  corSerie2 = '#EF4444',
}: {
  labels: string[];
  receitas: number[];
  despesas?: number[];
  labelSerie1?: string;
  labelSerie2?: string;
  corSerie1?: string;
  corSerie2?: string;
}) {
  const datasets = [
    {
      label: labelSerie1,
      data: receitas,
      backgroundColor: corSerie1,
      borderRadius: 4,
    },
  ];

  if (despesas) {
    datasets.push({
      label: labelSerie2,
      data: despesas,
      backgroundColor: corSerie2,
      borderRadius: 4,
    });
  }

  return (
    <div className="h-56">
      <Bar
        data={{ labels, datasets }}
        options={{
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
          scales: { y: { beginAtZero: true } },
        }}
      />
    </div>
  );
}
