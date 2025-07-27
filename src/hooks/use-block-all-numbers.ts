import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useBlockAllNumbers = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      console.log('🚀 Iniciando bloqueo de todos los números...');
      
      // Получаем активный розыгрыш
      const { data: activeLottery, error: lotteryError } = await supabase
        .from('lottery_draws')
        .select('id')
        .eq('status', 'active')
        .single();

      if (lotteryError) {
        console.error('❌ Error obteniendo sorteo activo:', lotteryError);
        throw new Error('Error obteniendo sorteo activo: ' + lotteryError.message);
      }

      if (!activeLottery) {
        console.error('❌ No se encontró sorteo activo');
        throw new Error('No se encontró un sorteo activo');
      }

      console.log('✅ Sorteo activo encontrado:', activeLottery.id);

      // Проверяем какие номера уже заблокированы
      const { data: existingApplications, error: checkError } = await supabase
        .from('applications')
        .select('number')
        .eq('draw_id', activeLottery.id);

      if (checkError) {
        console.error('❌ Error verificando números existentes:', checkError);
        throw new Error('Error verificando números existentes: ' + checkError.message);
      }

      const existingNumbers = new Set(existingApplications?.map(app => app.number) || []);
      console.log(`📊 Números ya bloqueados: ${existingNumbers.size}/100`);

      // Создаем только те номера, которых еще нет
      const applications = [];
      for (let i = 1; i <= 100; i++) {
        if (!existingNumbers.has(i)) {
          applications.push({
            draw_id: activeLottery.id,
            number: i,
            status: 'approved',
            created_by: null, // Используем null вместо тестового UUID
            full_name: 'TEST USER',
            phone: '000-000-0000',
            email: 'test@test.com',
            bank_account: '0000000000',
            bank_name: 'TEST BANK',
            payment_reference: 'TEST-REF-' + i,
            reserved_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +24 часа
          });
        }
      }

      console.log(`📝 Creando ${applications.length} nuevas aplicaciones...`);

      if (applications.length === 0) {
        console.log('ℹ️ Todos los números ya están bloqueados');
        return { success: true, message: 'Todos los números ya estaban bloqueados' };
      }

      // Вставляем заявки пакетами по 10 (для избежания превышения лимитов)
      const batchSize = 10;
      for (let i = 0; i < applications.length; i += batchSize) {
        const batch = applications.slice(i, i + batchSize);
        console.log(`📦 Insertando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(applications.length/batchSize)}...`);
        
        const { error: insertError } = await supabase
          .from('applications')
          .insert(batch);

        if (insertError) {
          console.error('❌ Error insertando lote:', insertError);
          throw new Error(`Error insertando números ${i+1}-${i+batch.length}: ${insertError.message}`);
        }
      }

      console.log('✅ Todos los números bloqueados exitosamente');
      return { success: true, created: applications.length };
    },
    onSuccess: (data) => {
      console.log('🎉 Operación completada:', data);
      
      // Обновляем все связанные кэши
      queryClient.invalidateQueries({ queryKey: ['activeLotteryStats'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['reservedNumbers'] });
      
      toast({
        title: "¡Números bloqueados!",
        description: data?.created ? 
          `Se bloquearon ${data.created} números nuevos` : 
          "Todos los números ya estaban bloqueados",
        variant: "default",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.toString() || "Error desconocido";
      console.error('❌ Error blocking all numbers:', errorMessage);
      console.error('❌ Error object:', error);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}; 