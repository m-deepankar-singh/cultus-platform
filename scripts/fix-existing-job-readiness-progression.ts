/**
 * One-time script to fix job readiness progression for users who already completed assessments
 * but don't have stars/tiers assigned due to the previous bug.
 */

import { createClient } from '@supabase/supabase-js'

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixExistingJobReadinessProgression() {
  console.log('🔍 Finding users with completed job readiness assessments but no stars/tiers...')

  try {
    // Find all students who have completed job readiness assessments but don't have stars
    const { data: studentsWithoutStars, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        full_name,
        email,
        job_readiness_star_level,
        job_readiness_tier,
        client_id
      `)
      .is('job_readiness_star_level', null)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return
    }

    console.log(`📊 Found ${studentsWithoutStars?.length || 0} students without job readiness stars`)

    if (!studentsWithoutStars || studentsWithoutStars.length === 0) {
      console.log('✅ No students need fixing')
      return
    }

    let fixedCount = 0
    let errorCount = 0

    for (const student of studentsWithoutStars) {
      try {
        console.log(`\n🔄 Processing student: ${student.full_name} (${student.email})`)

        // Find job readiness products for this student's client
        const { data: jobReadinessProducts, error: productsError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            type,
            client_product_assignments!inner (
              client_id
            )
          `)
          .eq('type', 'JOB_READINESS')
          .eq('client_product_assignments.client_id', student.client_id)

        if (productsError || !jobReadinessProducts || jobReadinessProducts.length === 0) {
          console.log(`   ⚠️  No job readiness products found for student's client`)
          continue
        }

        // Check each job readiness product for completed assessments
        let bestTier: 'BRONZE' | 'SILVER' | 'GOLD' | null = null
        let totalAssessments = 0
        let totalScore = 0

        for (const product of jobReadinessProducts) {
          // Get tier configuration for this product
          const { data: tierConfig } = await supabase
            .from('job_readiness_products')
            .select('*')
            .eq('product_id', product.id)
            .maybeSingle()

          const defaultTierConfig = {
            bronze_assessment_min_score: 0,
            bronze_assessment_max_score: 60,
            silver_assessment_min_score: 61,
            silver_assessment_max_score: 80,
            gold_assessment_min_score: 81,
            gold_assessment_max_score: 100
          }

          const finalTierConfig = tierConfig || defaultTierConfig

          // Find completed assessments for this product
          const { data: completedAssessments, error: completedError } = await supabase
            .from('modules')
            .select(`
              id,
              name,
              module_product_assignments!inner (
                product_id
              ),
              student_module_progress!inner (
                status,
                progress_percentage,
                completed_at
              )
            `)
            .eq('module_product_assignments.product_id', product.id)
            .eq('type', 'Assessment')
            .eq('student_module_progress.student_id', student.id)
            .eq('student_module_progress.status', 'Completed')

          if (!completedError && completedAssessments && completedAssessments.length > 0) {
            console.log(`   ✅ Found ${completedAssessments.length} completed assessments for product: ${product.name}`)
            
            // Calculate average score for this product
            let productScore = 0
            let productAssessmentCount = 0
            let hasPassedAssessment = false

            for (const assessment of completedAssessments) {
              const progressData = assessment.student_module_progress[0]
              if (progressData?.progress_percentage !== undefined) {
                productScore += progressData.progress_percentage
                productAssessmentCount++
                totalScore += progressData.progress_percentage
                totalAssessments++
                
                if (progressData.progress_percentage >= 60) {
                  hasPassedAssessment = true
                }
                
                console.log(`      - ${assessment.name}: ${progressData.progress_percentage}%`)
              }
            }

            // Determine tier for this product if student passed at least one assessment
            if (productAssessmentCount > 0 && hasPassedAssessment) {
              const averageScore = productScore / productAssessmentCount
              let productTier: 'BRONZE' | 'SILVER' | 'GOLD' | null = null

              if (averageScore >= finalTierConfig.gold_assessment_min_score) {
                productTier = 'GOLD'
              } else if (averageScore >= finalTierConfig.silver_assessment_min_score) {
                productTier = 'SILVER'
              } else if (averageScore >= finalTierConfig.bronze_assessment_min_score) {
                productTier = 'BRONZE'
              }

              console.log(`   📊 Product average score: ${Math.round(averageScore)}% → Tier: ${productTier}`)

              // Keep the highest tier achieved across all products
              const tierRanking = { 'BRONZE': 1, 'SILVER': 2, 'GOLD': 3 }
              if (productTier && (!bestTier || tierRanking[productTier] > tierRanking[bestTier])) {
                bestTier = productTier
              }
            }
          }
        }

        // Update student if they have completed assessments and deserve a tier
        if (totalAssessments > 0 && bestTier) {
          const overallAverageScore = Math.round(totalScore / totalAssessments)
          
          const updateData = {
            job_readiness_star_level: 'ONE',
            job_readiness_tier: bestTier,
            job_readiness_last_updated: new Date().toISOString(),
          }

          const { error: updateError } = await supabase
            .from('students')
            .update(updateData)
            .eq('id', student.id)

          if (updateError) {
            console.error(`   ❌ Error updating student ${student.email}:`, updateError)
            errorCount++
          } else {
            console.log(`   ✅ Updated ${student.full_name}: Star ONE, Tier ${bestTier} (${totalAssessments} assessments, avg: ${overallAverageScore}%)`)
            fixedCount++
          }
        } else {
          console.log(`   ⚠️  No completed assessments with passing scores found`)
        }

      } catch (error) {
        console.error(`   ❌ Error processing student ${student.email}:`, error)
        errorCount++
      }
    }

    console.log(`\n📋 Summary:`)
    console.log(`   ✅ Successfully fixed: ${fixedCount} students`)
    console.log(`   ❌ Errors encountered: ${errorCount} students`)
    console.log(`   📊 Total processed: ${studentsWithoutStars.length} students`)

  } catch (error) {
    console.error('Fatal error in fixExistingJobReadinessProgression:', error)
  }
}

// Run the script
fixExistingJobReadinessProgression()
  .then(() => {
    console.log('\n🎉 Script completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })