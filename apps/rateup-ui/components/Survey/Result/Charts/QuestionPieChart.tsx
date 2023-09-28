import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Stack, Text, Group, Paper , useMantineTheme } from '@mantine/core';

const COLORS = ['#64D29D', '#CB4754', '#F7B583', '#118AB2', '#4160AB'];

interface DataItem {
    name: string;
    value: number;
    total: number;
  }
  
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: DataItem }>;
    total?: number
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, total }) => {

const theme = useMantineTheme();
// const transparentWhite = theme.fn.rgba(theme.white, 0.7); VERIFY MANTINE

if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = ((data?.value / total) * 100).toFixed(2);
    return (
    <Paper px="sm" shadow='xl' style={{ backgroundColor: 'rgba(255,255,255,0.7)' }}>
        <p>{`${data?.name}: ${data?.value} (${percentage}%)`}</p>
    </Paper>
    );
}
return null;
};

interface QuestionPieChartProps {
    question: string;
    type: string;
    data: any;
    responseCount: number;
    no: number;
}

const QuestionPieChart: React.FC<QuestionPieChartProps> = ({ no, question, type, responseCount, data }) =>{

    const chartData = [
        { name: 'Promoters', value: data?.promoters },
        { name: 'Detractors', value: data?.detractors },
        { name: 'Passives', value: data?.passives }
      ];

return    (

    <Group justify="space-between">
        <Stack ml="xl" style={{width: '50%'}}>
             <Text  size="md">{no}. {question}</Text>

             <Stack ml="xl" pt="sm">
                <Text size="md" color="gray" mt="sm"> {type}</Text>
                <Text size="md" color="gray">{responseCount} responses</Text>
                <Text mt="sm" pt="lg" size="lg" fw={500}>NPS Score = {data?.score?.toFixed(2)}</Text>
             </Stack>
        </Stack>
        <Stack style={{width: '42%'}}>
            <PieChart width={300} height={270}>
                <Pie
                    dataKey="value"
                    isAnimationActive={false}
                    data={chartData}
                    cx={100}
                    cy={110}
                    outerRadius={55}
                    fill="#8884d8"
                    label
                >
                    {chartData?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                </Pie>
                <Tooltip content={<CustomTooltip total={data?.total} />} />
                <Legend />
            </PieChart>
        </Stack>

        </Group>
)};

export default QuestionPieChart