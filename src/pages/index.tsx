import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function App() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Example Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is an example page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
