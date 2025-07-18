const { createClient } = require('../lib/supabase/server.js');

async function testProductPerformanceCache() {
  try {
    const supabase = await createClient();
    
    console.log('🧪 Testing Product Performance Cache...');
    
    const { data, error } = await supabase.rpc('get_product_performance_cached', {
      p_client_id: null,
      p_cache_duration: '15 minutes'
    });
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Success! Product count:', data?.length || 0);
      console.log('📊 First product:', data?.[0]?.productName || 'None');
      console.log('📈 Average progress:', data?.[0]?.averageOverallProductProgress || 0);
    }
  } catch (err) {
    console.error('💥 Exception:', err.message);
  }
}

testProductPerformanceCache(); 